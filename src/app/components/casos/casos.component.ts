import { ChangeDetectorRef, Component, NgZone, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';
import { NuevaConversacionComponent } from '../nueva-conversacion/nueva-conversacion.component';
import { WebSocketService } from '../../services/websocket.service';
import { catchError, firstValueFrom, forkJoin, of, Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { Mensaje } from '../../models/mensaje.model';
import { MensajesService } from '../../services/mensajes.service';
import { TiposService } from '../../services/tipos.service';
import { Tipo } from '../../models/tipo.model';
import { NotificacionesService } from '../../services/notificaciones.service';
import { AsesoresService } from '../../services/asesores.service';

type TipoVista = 'en-proceso' | 'cerrados';

// Constantes
const CONSTANTES = {
  DEBOUNCE_TIME: 500,
  SCROLL_DEBOUNCE: 150,
  SCROLL_THRESHOLD: 100,
  DELAY_CHAT_ABIERTO: 500,
  DELAY_RECARGAR_CASO: 1000,
  DELAY_CARGAR_CASOS: 500,
  TAMANO_PAGINA: 10,
  MESES: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
} as const;

const MENSAJES_TIPO = {
  image: '📷 Imagen',
  video: '🎥 Video',
  audio: '🎵 Audio',
  default: 'Mensaje'
} as const;

@Component({
  selector: 'app-casos',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent, NuevaConversacionComponent],
  templateUrl: './casos.component.html',
  styleUrls: ['./casos.component.scss']
})
export class CasosComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('casosLista') casosListaContainer!: ElementRef;

  casos: Caso[] = [];
  casoSeleccionado: Caso | null = null;
  ultimosMensajes: Map<string, { texto: string; fecha: string }> = new Map();
  filtro: string = '';
  todosLosCasos: Caso[] = [];
  mostrarModal: boolean = false;
  idAsesor: string = '';
  tipoVista: TipoVista = 'en-proceso';
  mensajes!: Mensaje[];

  // Variables para paginación
  paginaActual: number = 0;
  tamanoPagina: number = CONSTANTES.TAMANO_PAGINA;
  cargandoMasCasos: boolean = false;
  hayMasCasos: boolean = true;
  private scrollTimeout: any = null;

  // Cache de tipos
  tiposCache: Map<string, Tipo> = new Map();

  // Variables para búsqueda
  private busquedaSubject = new Subject<string>();
  enModoBusqueda: boolean = false;

  // Suscripciones de WebSocket
  private subscripciones: Subscription[] = [];

  constructor(
    private casosService: CasosService,
    private asesorService: AsesoresService,
    private mensajesService: MensajesService,
    private tiposService: TiposService,
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private notificacionesService: NotificacionesService
  ) {}

  ngOnInit(): void {
    this.inicializarAsesor();
    this.configurarBusqueda();
    this.configurarVista();
    this.verificarChatPendiente();
  }

  ngOnDestroy(): void {
    this.busquedaSubject.complete();
    this.destruirWebSockets();
  }

  ngAfterViewInit(): void {
    this.configurarScrollInfinito();
  }

  // ==================== INICIALIZACIÓN ====================

  private inicializarAsesor(): void {
    const usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
    this.idAsesor = usuarioEntidad?.numeroDocumento || '';
  }

  private configurarBusqueda(): void {
    this.busquedaSubject.pipe(
      debounceTime(CONSTANTES.DEBOUNCE_TIME),
      distinctUntilChanged()
    ).subscribe(termino => this.realizarBusqueda(termino));
  }

  private configurarVista(): void {
    this.route.data.subscribe(data => {
      this.tipoVista = data['tipo'] || 'en-proceso';
      this.resetearPaginacion();
      this.cargarCasos();
      this.destruirWebSockets();

      if (this.tipoVista === 'en-proceso') {
        this.inicializarWebSockets();
      } else {
        this.inicializarWebSocketMensajesNuevos();
      }
    });
  }

  private verificarChatPendiente(): void {
    const state = history.state as { casoId: string };

    if (state?.casoId) {
      setTimeout(() => {
        const caso = this.casos.find(c => c.id === state.casoId);
        if (caso) this.abrirChat(caso);
      }, CONSTANTES.DELAY_CHAT_ABIERTO);
    } else {
      this.restaurarChatAbierto();
    }
  }

  private configurarScrollInfinito(): void {
    if (!this.casosListaContainer) return;

    const container = this.casosListaContainer.nativeElement;

    container.addEventListener('scroll', () => {
      if (this.cargandoMasCasos) return;

      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      this.scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;

        if (scrollHeight - (scrollTop + clientHeight) <= CONSTANTES.SCROLL_THRESHOLD
            && this.hayMasCasos
            && !this.cargandoMasCasos) {
          this.cargarCasos();
        }
      }, CONSTANTES.SCROLL_DEBOUNCE);
    });
  }

  // ==================== WEBSOCKETS ====================

  private inicializarWebSocketMensajesNuevos(): void {
    const sub = this.wsService.suscribirAMensajesNuevos().subscribe(nuevoMensaje => {
      console.log('Mensaje nuevo recibido por WebSocket global (vista cerrados):', nuevoMensaje);
      this.ngZone.run(() => {
        if (nuevoMensaje.esDelUsuario !== false) {
          const mensajeTexto = this.obtenerTextoMensaje(nuevoMensaje);
          this.notificacionesService.notificarMensajeNuevo(
            nuevoMensaje.numeroUsuario || 'Usuario',
            mensajeTexto
          );
        }
      });
    });

    this.subscripciones.push(sub);
  }

  private inicializarWebSockets(): void {
    this.suscribirNuevosCasos();
    this.suscribirCasosAtendidos();
    this.suscribirMensajesNuevos();
  }

  private suscribirNuevosCasos(): void {
    const sub = this.wsService.obtenerNuevosCasos().subscribe(newCaso => {
      console.log('Nuevo caso recibido:', newCaso);

      const existe = this.casos.some(c => c.id === newCaso.id);
      if (existe) return;

      this.ngZone.run(() => {
        this.todosLosCasos = [...this.casos, newCaso];
        this.casos = [...this.todosLosCasos];
        console.log('Casos actualizados:', this.casos);

        this.cargarUltimosMensajes([newCaso]);
        this.cargarTiposDeCasos([newCaso]);
        this.notificarNuevoCaso(newCaso);
        this.cdr.markForCheck();
      });
    });

    this.subscripciones.push(sub);
  }

  private notificarNuevoCaso(caso: Caso): void {
    if (!caso.tipoId || caso.tipoId === '') {
      this.notificacionesService.notificarNuevoCaso(caso.numeroUsuario, 'Caso sin tipo');
      return;
    }

    this.tiposService.obtenerTipoPorId(caso.tipoId).subscribe({
      next: response => {
        this.notificacionesService.notificarNuevoCaso(
          caso.numeroUsuario,
          response.Tipo?.nombre || 'Caso'
        );
      },
      error: () => {
        this.notificacionesService.notificarNuevoCaso(caso.numeroUsuario, 'Caso');
      }
    });
  }

  private suscribirCasosAtendidos(): void {
    const sub = this.wsService.suscribirACasosAtendidos().subscribe(casoAtendido => {
      console.log('Caso atendido:', casoAtendido);
      const casoIndex = this.casos.findIndex(c => c.id === casoAtendido.id);

      if (casoIndex !== -1) {
        this.casos[casoIndex].estado = 1;
        this.cdr.detectChanges();
      }
    });

    this.subscripciones.push(sub);
  }

  private suscribirMensajesNuevos(): void {
    const sub = this.wsService.suscribirAMensajesNuevos().subscribe(nuevoMensaje => {
      console.log('Mensaje nuevo recibido por WebSocket global:', nuevoMensaje);
      this.ngZone.run(() => {
        this.procesarMensajeNuevo(nuevoMensaje);
      });
    });

    this.subscripciones.push(sub);
  }

  private procesarMensajeNuevo(nuevoMensaje: any): void {
    const casoIndex = this.casos.findIndex(c => c.id === nuevoMensaje.casoId);
    if (casoIndex === -1) return;

    // Incrementar contador si el chat no está abierto y el mensaje es del usuario
    if (this.casoSeleccionado?.id !== nuevoMensaje.casoId && nuevoMensaje.esDelUsuario !== false) {
      this.casos[casoIndex].mensajesNoLeidos = (this.casos[casoIndex].mensajesNoLeidos || 0) + 1;

      const caso = this.casos[casoIndex];
      const mensajeTexto = this.obtenerTextoMensaje(nuevoMensaje);
      this.notificacionesService.notificarMensajeNuevo(caso.numeroUsuario, mensajeTexto);
    }

    // Actualizar último mensaje
    const fechaFormateada = this.formatearFecha(new Date(nuevoMensaje.fecha));
    this.ultimosMensajes.set(nuevoMensaje.casoId, {
      texto: nuevoMensaje.mensaje || '',
      fecha: fechaFormateada
    });

    this.cdr.detectChanges();
  }

  private destruirWebSockets(): void {
    this.subscripciones.forEach(sub => sub.unsubscribe());
    this.subscripciones = [];
  }

  // ==================== CARGA DE CASOS ====================

  private resetearPaginacion(): void {
    this.paginaActual = 0;
    this.hayMasCasos = true;
    this.cargandoMasCasos = false;
    this.casos = [];
    this.todosLosCasos = [];
  }

  cargarCasos(): void {
    if (this.cargandoMasCasos || !this.hayMasCasos) return;

    if (this.enModoBusqueda && this.filtro.trim() !== '') {
      this.cargarResultadosBusqueda(this.filtro.trim());
      return;
    }

    this.tipoVista === 'en-proceso' ? this.cargarCasosEnProceso() : this.cargarCasosCerrados();
  }

  private cargarCasosEnProceso(): void {
    this.cargandoMasCasos = true;

    forkJoin({
      enProceso: this.casosService.getCasosPorEstado(0, this.paginaActual, this.tamanoPagina).pipe(
        catchError(error => {
          console.warn('Error al obtener casos en proceso:', error);
          return of({ listadoCasos: [], mensaje: 'Sin casos en proceso.' });
        })
      ),
      abiertos: this.casosService.getCasosPorEstado(1, this.paginaActual, this.tamanoPagina).pipe(
        catchError(error => {
          console.warn('Error al obtener casos abiertos:', error);
          return of({ listadoCasos: [], mensaje: 'Sin casos abiertos.' });
        })
      )
    }).subscribe(({ enProceso, abiertos }) => {
      const nuevosCasos = [
        ...(enProceso?.listadoCasos || []),
        ...(abiertos?.listadoCasos || [])
      ];

      this.procesarCasosCargados(nuevosCasos);
    });
  }

  private cargarCasosCerrados(): void {
    this.cargandoMasCasos = true;

    this.casosService.getCasosPorEstado(2, this.paginaActual, this.tamanoPagina).subscribe({
      next: response => {
        const nuevosCasos = response?.listadoCasos || [];
        this.procesarCasosCargados(nuevosCasos);
      },
      error: error => {
        console.error('Error al cargar casos cerrados:', error);
        this.cargandoMasCasos = false;
        this.hayMasCasos = false;
        this.cdr.detectChanges();
      }
    });
  }

  private procesarCasosCargados(nuevosCasos: any[]): void {
    this.hayMasCasos = nuevosCasos.length === this.tamanoPagina;
    this.agregarCasos(nuevosCasos);
    this.paginaActual++;
    this.cargarUltimosMensajes(nuevosCasos);
    this.cargarTiposDeCasos(nuevosCasos);

    setTimeout(() => {
      this.cargandoMasCasos = false;
      this.cdr.detectChanges();
    }, CONSTANTES.DELAY_CARGAR_CASOS);
  }

  private agregarCasos(nuevosCasos: any[]): void {
    this.todosLosCasos = [...this.casos, ...nuevosCasos];
    this.casos = [...this.todosLosCasos];
    this.ordenarCasosPorFecha();
  }

  private ordenarCasosPorFecha(): void {
    this.casos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  // ==================== GESTIÓN DE CHAT ====================

  abrirChat(caso: Caso): void {
    if (caso.mensajesNoLeidos > 0) {
      this.marcarCasoComoVisto(caso);
    }

    if (this.tipoVista === 'en-proceso' && caso.estado === 0) {
      caso.estado = 1;
      this.atenderCaso(caso.id, () => {
        setTimeout(() => this.recargarCasoActualizado(caso.id), CONSTANTES.DELAY_RECARGAR_CASO);
      });
    } else {
      this.casoSeleccionado = caso;
      sessionStorage.setItem(`chatAbierto_${this.tipoVista}`, caso.id);
    }
  }

  private marcarCasoComoVisto(caso: Caso): void {
    this.casosService.marcarCasoComoVisto(caso.id).subscribe({
      next: () => {
        caso.mensajesNoLeidos = 0;
        this.cdr.detectChanges();
      },
      error: (error) => console.error('Error al marcar caso como visto:', error)
    });
  }

  private recargarCasoActualizado(casoId: string): void {
    forkJoin({
      enProceso: this.casosService.getCasosPorEstado(0, 0, 10).pipe(
        catchError(error => of({ listadoCasos: [] }))
      ),
      abiertos: this.casosService.getCasosPorEstado(1, 0, 10).pipe(
        catchError(error => of({ listadoCasos: [] }))
      )
    }).subscribe(({ enProceso, abiertos }) => {
      const todosLosCasos = [
        ...(enProceso?.listadoCasos || []),
        ...(abiertos?.listadoCasos || [])
      ];

      const casoActualizado = todosLosCasos.find(c => c.id === casoId);

      if (casoActualizado) {
        const index = this.casos.findIndex(c => c.id === casoId);
        if (index !== -1) {
          this.casos[index] = casoActualizado;
        }

        this.casoSeleccionado = casoActualizado;
        sessionStorage.setItem(`chatAbierto_${this.tipoVista}`, casoActualizado.id);
        this.cdr.detectChanges();
      } else {
        console.warn('No se pudo encontrar el caso actualizado:', casoId);
      }
    });
  }

  cerrarChat(): void {
    this.casoSeleccionado = null;
    sessionStorage.removeItem(`chatAbierto_${this.tipoVista}`);
  }

  private restaurarChatAbierto(): void {
    const casoGuardadoId = sessionStorage.getItem(`chatAbierto_${this.tipoVista}`);

    if (casoGuardadoId) {
      setTimeout(() => {
        const caso = this.casos.find(c => c.id === casoGuardadoId);
        if (caso) {
          this.casoSeleccionado = caso;
        } else {
          sessionStorage.removeItem(`chatAbierto_${this.tipoVista}`);
        }
      }, CONSTANTES.DELAY_CHAT_ABIERTO);
    }
  }

  // ==================== GESTIÓN DE ESTADOS ====================

  cambiarEstado(event: Event, caso: Caso): void {
    event.stopPropagation();
    console.log('Estado cambiado:', caso.estado, typeof caso.estado);

    if (+caso.estado === 0) {
      alert("No se puede volver a poner como sin atender");
      caso.estado = 1;
    } else if (+caso.estado === 1) {
      this.atenderCaso(caso.id);
    } else if (+caso.estado === 2) {
      this.cerrarCaso(caso.id);
    }
  }

  atenderCaso(casoId: string, callback?: () => void): void {
    this.asesorService.atenderCaso(casoId).subscribe({
      next: response => {
        if (callback) {
          callback();
        } else {
          alert('Caso atendido exitosamente');
          this.cargarCasos();
        }
      },
      error: error => {
        console.error('Error al atender caso:', error);
        this.cargarCasos();
      }
    });
  }

  cerrarCaso(casoId: string): void {
    if (!confirm('¿Está seguro de cerrar este caso?')) return;

    this.casosService.cerrarCaso(casoId).subscribe({
      next: response => {
        if (this.casoSeleccionado?.id === casoId) {
          this.cerrarChat();
        }

        this.casos = this.casos.filter(caso => caso.id !== casoId);
        this.cdr.detectChanges();
        alert('Caso cerrado exitosamente');
      },
      error: err => {
        console.error('Error al cerrar el caso:', err);
        alert('Hubo un error al cerrar el caso');
      }
    });
  }

  // ==================== BÚSQUEDA ====================

  filtrarCasos(): void {
    const texto = this.filtro.trim();

    if (texto === '') {
      this.enModoBusqueda = false;
      this.resetearPaginacion();
      this.cargarCasos();
    } else {
      this.busquedaSubject.next(texto);
    }
  }

  private realizarBusqueda(termino: string): void {
    if (termino.trim() === '') return;

    this.enModoBusqueda = true;
    this.resetearPaginacion();
    this.cargarResultadosBusqueda(termino);
  }

  private cargarResultadosBusqueda(termino: string): void {
    if (this.cargandoMasCasos || !this.hayMasCasos) return;

    this.cargandoMasCasos = true;

    if (this.tipoVista === 'en-proceso') {
      this.buscarCasosEnProceso(termino);
    } else {
      this.buscarCasosCerrados(termino);
    }
  }

  private buscarCasosEnProceso(termino: string): void {
    forkJoin({
      enProceso: this.casosService.buscarCasosPorCelular(termino, 0, this.paginaActual, this.tamanoPagina).pipe(
        catchError(error => of({ listadoCasos: [], mensaje: 'Sin resultados en proceso.' }))
      ),
      abiertos: this.casosService.buscarCasosPorCelular(termino, 1, this.paginaActual, this.tamanoPagina).pipe(
        catchError(error => of({ listadoCasos: [], mensaje: 'Sin resultados abiertos.' }))
      )
    }).subscribe(({ enProceso, abiertos }) => {
      const nuevosCasos = [
        ...(enProceso?.listadoCasos || []),
        ...(abiertos?.listadoCasos || [])
      ];

      this.procesarCasosCargados(nuevosCasos);
    });
  }

  private buscarCasosCerrados(termino: string): void {
    this.casosService.buscarCasosPorCelular(termino, 2, this.paginaActual, this.tamanoPagina).subscribe({
      next: response => {
        const nuevosCasos = response?.listadoCasos || [];
        this.procesarCasosCargados(nuevosCasos);
      },
      error: error => {
        console.error('Error al buscar casos cerrados:', error);
        this.cargandoMasCasos = false;
        this.hayMasCasos = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ==================== MENSAJES Y TIPOS ====================

  private cargarUltimosMensajes(casos: Caso[]): void {
    const requests = casos.map(caso =>
      this.mensajesService.getUltimoMensajeChat(caso.id).pipe(
        catchError(error => {
          console.warn(`Error al obtener último mensaje del caso ${caso.id}:`, error);
          return of(null);
        })
      )
    );

    forkJoin(requests).subscribe(responses => {
      responses.forEach((response, index) => {
        if (response?.mensaje) {
          const caso = casos[index];
          const fechaFormateada = this.formatearFecha(new Date(response.mensaje.fecha));

          this.ultimosMensajes.set(caso.id, {
            texto: response.mensaje.mensaje || '',
            fecha: fechaFormateada
          });
        }
      });

      this.cdr.detectChanges();
    });
  }

  obtenerHora(casoId: string): string {
    return this.ultimosMensajes.get(casoId)?.fecha || '';
  }

  obtenerUltimoMensaje(casoId: string): string {
    return this.ultimosMensajes.get(casoId)?.texto || '';
  }

  actualizarUltimoMensaje(nuevoMensaje: any): void {
    if (!nuevoMensaje) return;

    const casoId = nuevoMensaje.casoId || this.casoSeleccionado?.id;
    if (!casoId) return;

    const fechaFormateada = this.formatearFecha(new Date(nuevoMensaje.fecha));

    this.ultimosMensajes.set(casoId, {
      texto: nuevoMensaje.mensaje || '',
      fecha: fechaFormateada
    });

    // Incrementar contador si el mensaje no es del chat abierto y es del usuario
    if (this.casoSeleccionado?.id !== casoId && nuevoMensaje.esDelUsuario !== false) {
      const casoIndex = this.casos.findIndex(c => c.id === casoId);
      if (casoIndex !== -1) {
        this.casos[casoIndex].mensajesNoLeidos = (this.casos[casoIndex].mensajesNoLeidos || 0) + 1;
      }
    }

    this.cdr.detectChanges();
  }

  actualizarTipoEnCache(evento: {casoId: string, tipoId: string, tipo: Tipo}): void {
    // Actualizar el cache de tipos
    this.tiposCache.set(evento.tipoId, evento.tipo);

    // Actualizar el tipoId en el caso correspondiente de la lista
    const casoIndex = this.casos.findIndex(c => c.id === evento.casoId);
    if (casoIndex !== -1) {
      this.casos[casoIndex].tipoId = evento.tipoId;
    }

    // Forzar la detección de cambios para actualizar la vista
    this.cdr.detectChanges();
  }

  obtenerTipo(caso: Caso): string {
    if (!caso.tipoId || caso.tipoId === '') {
      return 'Sin tipo asignado';
    }
    if (this.tiposCache.has(caso.tipoId)) {
      return this.tiposCache.get(caso.tipoId)!.nombre;
    }
    return 'Cargando...';
  }

  private cargarTiposDeCasos(casos: Caso[]): void {
    // Filtrar casos que tienen tipoId antes de intentar cargar los tipos
    const tiposIdsUnicos = [...new Set(casos.filter(c => c.tipoId && c.tipoId !== '').map(c => c.tipoId))];
    const tiposIdsNoEnCache = tiposIdsUnicos.filter(id => !this.tiposCache.has(id));

    if (tiposIdsNoEnCache.length === 0) return;

    const requests = tiposIdsNoEnCache.map(tipoId =>
      this.tiposService.obtenerTipoPorId(tipoId).pipe(
        catchError(error => {
          console.error(`Error al obtener tipo ${tipoId}:`, error);
          return of(null);
        })
      )
    );

    forkJoin(requests).subscribe(responses => {
      responses.forEach((response, index) => {
        if (response?.Tipo) {
          const tipoId = tiposIdsNoEnCache[index];
          this.tiposCache.set(tipoId, response.Tipo);
        }
      });

      this.cdr.detectChanges();
    });
  }

  // ==================== MODAL ====================

  abrirModalNuevoChat(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onCasoCreado(caso: any): void {
    this.abrirChat(caso);
  }

  // ==================== UTILIDADES ====================

  private formatearFecha(fecha: Date): string {
    const day = fecha.getDate();
    const month = CONSTANTES.MESES[fecha.getMonth()];
    const hours = fecha.getHours();
    const minutes = fecha.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;

    return `${day}/${month} ${hours12}:${minutesStr}${ampm}`;
  }

  private obtenerTextoMensaje(mensaje: any): string {
    if (mensaje.mensaje) return mensaje.mensaje;

    return MENSAJES_TIPO[mensaje.tipo as keyof typeof MENSAJES_TIPO] || MENSAJES_TIPO.default;
  }

  // ==================== GETTERS ====================

  get esModoSoloLectura(): boolean {
    return this.tipoVista === 'cerrados';
  }

  get mensajeVacio(): string {
    return this.tipoVista === 'en-proceso'
      ? 'No hay casos asignados'
      : 'No hay casos cerrados';
  }

  get imagenAvatar(): string {
    return this.tipoVista === 'en-proceso'
      ? 'assets/loloDuda.png'
      : 'assets/loloFin.png';
  }
}

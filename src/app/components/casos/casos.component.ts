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

  // Modal para nuevo chat (solo en vista "en-proceso")
  mostrarModal: boolean = false;

  idAsesor: string = '';

  // Propiedad que determina qué vista mostrar
  tipoVista: TipoVista = 'en-proceso';

  mensajes!: Mensaje[];

  // Variables para paginación
  paginaActual: number = 0;
  tamanoPagina: number = 10;
  cargandoMasCasos: boolean = false;
  hayMasCasos: boolean = true;
  private scrollTimeout: any = null;

  // Cache de tipos para evitar peticiones repetidas
  tiposCache: Map<string, Tipo> = new Map();

  // Variables para búsqueda dinámica
  private busquedaSubject = new Subject<string>();
  enModoBusqueda: boolean = false;

  // Variables para almacenar suscripciones de WebSocket
  private nuevosCasosSubscription?: Subscription;
  private casosAtendidosSubscription?: Subscription;
  private mensajesNuevosSubscription?: Subscription;

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
    const usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
    this.idAsesor = usuarioEntidad?.numeroDocumento || '';

    // Configurar búsqueda dinámica con debounce
    this.busquedaSubject.pipe(
      debounceTime(500), // Esperar 500ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo ejecutar si el valor cambió
    ).subscribe(termino => {
      this.realizarBusqueda(termino);
    });

    // Detectar el tipo de vista desde la ruta
    this.route.data.subscribe(data => {
      this.tipoVista = data['tipo'] || 'en-proceso';
      this.resetearPaginacion();
      this.cargarCasos();

      // Destruir WebSockets existentes antes de cambiar de vista
      this.destruirWebSockets();

      // Inicializar WebSockets según la vista
      if (this.tipoVista === 'en-proceso') {
        this.inicializarWebSockets();
      } else {
        // En vista de casos cerrados, solo suscribirse a mensajes nuevos para notificaciones
        this.inicializarWebSocketMensajesNuevos();
      }
    });

    // Verificar si se recibió un casoId desde la navegación
    const state = history.state as { casoId: string };

    if (state?.casoId) {
      // Esperar a que se carguen los casos y luego abrir el chat
      setTimeout(() => {
        const caso = this.casos.find(c => c.id === state.casoId);
        if (caso) {
          this.abrirChat(caso);
        }
      }, 500);
    } else {
      // Verificar si hay un chat abierto guardado en sessionStorage
      this.restaurarChatAbierto();
    }
  }

  ngOnDestroy(): void {
    // Limpiar subscripciones de búsqueda
    this.busquedaSubject.complete();

    // Destruir subscripciones de WebSocket
    this.destruirWebSockets();
  }

  ngAfterViewInit(): void {
    if (this.casosListaContainer) {
      const container = this.casosListaContainer.nativeElement;

      container.addEventListener('scroll', () => {
        // Si ya está cargando, no hacer nada
        if (this.cargandoMasCasos) {
          return;
        }

        // Limpiar timeout anterior si existe
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }

        // Esperar 150ms después del último evento de scroll antes de verificar
        this.scrollTimeout = setTimeout(() => {
          // Verificar si está cerca del final (dentro de los últimos 100px)
          const scrollTop = container.scrollTop;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;

          if (scrollHeight - (scrollTop + clientHeight) <= 100 && this.hayMasCasos && !this.cargandoMasCasos) {
            this.cargarCasos();
          }
        }, 150);
      });
    }
  }

  private resetearPaginacion(): void {
    this.paginaActual = 0;
    this.hayMasCasos = true;
    this.cargandoMasCasos = false;
    this.casos = [];
    this.todosLosCasos = [];
  }

  private restaurarChatAbierto(): void {
    const casoGuardadoId = sessionStorage.getItem(`chatAbierto_${this.tipoVista}`);

    if (casoGuardadoId) {
      // Esperar a que se carguen los casos y luego abrir el chat
      setTimeout(() => {
        const caso = this.casos.find(c => c.id === casoGuardadoId);
        if (caso) {
          this.casoSeleccionado = caso;
        } else {
          // Si el caso no existe, limpiar el sessionStorage
          sessionStorage.removeItem(`chatAbierto_${this.tipoVista}`);
        }
      }, 500);
    }
  }

  private inicializarWebSocketMensajesNuevos(): void {
    // WebSocket para mensajes nuevos - solo notificaciones
    // Este método se usa cuando estamos en la vista de casos cerrados
    this.mensajesNuevosSubscription = this.wsService.suscribirAMensajesNuevos().subscribe(nuevoMensaje => {
      console.log('Mensaje nuevo recibido por WebSocket global (vista cerrados):', nuevoMensaje);
      this.ngZone.run(() => {
        // Solo reproducir notificación si el mensaje es del usuario y NO del asesor
        if (nuevoMensaje.esDelUsuario !== false) {
          const mensajeTexto = nuevoMensaje.mensaje ||
            (nuevoMensaje.tipo === 'image' ? '📷 Imagen' :
             nuevoMensaje.tipo === 'video' ? '🎥 Video' :
             nuevoMensaje.tipo === 'audio' ? '🎵 Audio' :
             'Mensaje');

          // Notificar incluso si estamos en la vista de casos cerrados
          this.notificacionesService.notificarMensajeNuevo(
            nuevoMensaje.numeroUsuario || 'Usuario',
            mensajeTexto
          );
        }
      });
    });
  }

  private inicializarWebSockets(): void {
    // WebSocket para mostrar nuevos casos que aparecen
    this.nuevosCasosSubscription = this.wsService.obtenerNuevosCasos().subscribe(newCaso => {
      console.log('Nuevo caso recibido:', newCaso);
      // Solo agregar si no existe ya en la lista
      const existe = this.casos.some(c => c.id === newCaso.id);
      if (!existe) {
        this.ngZone.run(() => {
          this.todosLosCasos = [...this.casos, newCaso];
          this.casos = [...this.todosLosCasos];
          console.log('Casos actualizados:', this.casos);

          // Cargar el último mensaje del nuevo caso
          this.cargarUltimosMensajes([newCaso]);

          // Cargar tipo del nuevo caso
          this.cargarTiposDeCasos([newCaso]);

          // Reproducir notificación de nuevo caso
          this.tiposService.obtenerTipoPorId(newCaso.tipoId).subscribe({
            next: response => {
              this.notificacionesService.notificarNuevoCaso(
                newCaso.numeroUsuario,
                response.Tipo?.nombre || 'Caso'
              );
            },
            error: () => {
              this.notificacionesService.notificarNuevoCaso(
                newCaso.numeroUsuario,
                'Caso'
              );
            }
          });

          this.cdr.markForCheck();
        })
      }
    });

    // WebSocket para casos atendidos (actualizar estado)
    this.casosAtendidosSubscription = this.wsService.suscribirACasosAtendidos().subscribe(casoAtendido => {
      console.log('Caso atendido:', casoAtendido);
      const casoIndex = this.casos.findIndex(c => c.id === casoAtendido.id);
      if (casoIndex !== -1) {
        this.casos[casoIndex].estado = 1;
        this.cdr.detectChanges();
      }
    });

    // WebSocket para mensajes nuevos (actualizar contador de no leídos)
    this.mensajesNuevosSubscription = this.wsService.suscribirAMensajesNuevos().subscribe(nuevoMensaje => {
      console.log('Mensaje nuevo recibido por WebSocket global:', nuevoMensaje);
      this.ngZone.run(() => {
        // Buscar el caso en la lista
        const casoIndex = this.casos.findIndex(c => c.id === nuevoMensaje.casoId);

        if (casoIndex !== -1) {
          // Solo incrementar si el chat NO está abierto actualmente
          // Y solo si el mensaje es del USUARIO (no del asesor)
          if (this.casoSeleccionado?.id !== nuevoMensaje.casoId && nuevoMensaje.esDelUsuario !== false) {
            // Incrementar contador de mensajes no leídos
            this.casos[casoIndex].mensajesNoLeidos = (this.casos[casoIndex].mensajesNoLeidos || 0) + 1;

            // Reproducir sonido de notificación para mensaje nuevo
            const caso = this.casos[casoIndex];
            const mensajeTexto = nuevoMensaje.mensaje ||
              (nuevoMensaje.tipo === 'image' ? '📷 Imagen' :
               nuevoMensaje.tipo === 'video' ? '🎥 Video' :
               nuevoMensaje.tipo === 'audio' ? '🎵 Audio' :
               'Mensaje');

            this.notificacionesService.notificarMensajeNuevo(
              caso.numeroUsuario,
              mensajeTexto
            );
          }

          // Actualizar el último mensaje en la vista
          const fecha = new Date(nuevoMensaje.fecha);
          const day = fecha.getDate();
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const month = months[fecha.getMonth()];
          const hours = fecha.getHours();
          const minutes = fecha.getMinutes();
          const ampm = hours >= 12 ? 'pm' : 'am';
          const hours12 = hours % 12 || 12;
          const minutesStr = minutes < 10 ? '0' + minutes : minutes;
          const fechaFormateada = `${day}/${month} ${hours12}:${minutesStr}${ampm}`;

          this.ultimosMensajes.set(nuevoMensaje.casoId, {
            texto: nuevoMensaje.mensaje || '',
            fecha: fechaFormateada
          });

          this.cdr.detectChanges();
        }
      });
    });
  }

  private destruirWebSockets(): void {
    // Destruir todas las suscripciones de WebSocket
    if (this.nuevosCasosSubscription) {
      this.nuevosCasosSubscription.unsubscribe();
      this.nuevosCasosSubscription = undefined;
    }

    if (this.casosAtendidosSubscription) {
      this.casosAtendidosSubscription.unsubscribe();
      this.casosAtendidosSubscription = undefined;
    }

    if (this.mensajesNuevosSubscription) {
      this.mensajesNuevosSubscription.unsubscribe();
      this.mensajesNuevosSubscription = undefined;
    }
  }

  cargarCasos(): void {
    if (this.cargandoMasCasos || !this.hayMasCasos) return;

    // Si estamos en modo búsqueda, cargar resultados de búsqueda
    if (this.enModoBusqueda && this.filtro.trim() !== '') {
      this.cargarResultadosBusqueda(this.filtro.trim());
      return;
    }

    // De lo contrario, cargar casos normalmente
    if (this.tipoVista === 'en-proceso') {
      this.cargarCasosEnProceso();
    } else {
      this.cargarCasosCerrados();
    }
  }

  private cargarCasosEnProceso(): void {
    this.cargandoMasCasos = true;

    // Obtener casos estado 0 y 1 con paginación
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
      const nuevosCasos: any[] = [];

      if (enProceso?.listadoCasos) {
        nuevosCasos.push(...enProceso.listadoCasos);
        console.log(enProceso.mensaje);
      } else {
        console.log(enProceso?.mensaje || 'Sin casos en proceso.');
      }

      if (abiertos?.listadoCasos?.length) {
        nuevosCasos.push(...abiertos.listadoCasos);
        console.log(abiertos.mensaje);
      } else {
        console.log(abiertos?.mensaje || 'Sin casos abiertos.');
      }

      // Verificar si hay más casos para cargar
      this.hayMasCasos = nuevosCasos.length === this.tamanoPagina;

      // Agregar casos sin duplicados
      this.agregarCasos(nuevosCasos);

      // Incrementar página para la próxima carga
      this.paginaActual++;

      // Cargar últimos mensajes para los nuevos casos
      this.cargarUltimosMensajes(nuevosCasos);

      // Cargar tipos de los nuevos casos
      this.cargarTiposDeCasos(nuevosCasos);

      // Esperar un poco antes de permitir nueva carga
      setTimeout(() => {
        this.cargandoMasCasos = false;
        this.cdr.detectChanges();
      }, 500);
    });
  }

  private cargarCasosCerrados(): void {
    this.cargandoMasCasos = true;

    this.casosService.getCasosPorEstado(2, this.paginaActual, this.tamanoPagina).subscribe({
      next: response => {
        if (response?.listadoCasos) {
          const nuevosCasos = response.listadoCasos;

          // Verificar si hay más casos para cargar
          this.hayMasCasos = nuevosCasos.length === this.tamanoPagina;

          // Agregar casos sin duplicados
          this.agregarCasos(nuevosCasos);

          // Incrementar página para la próxima carga
          this.paginaActual++;

          console.log(response.mensaje);

          // Cargar últimos mensajes para los nuevos casos
          this.cargarUltimosMensajes(nuevosCasos);

          // Cargar tipos de los nuevos casos
          this.cargarTiposDeCasos(nuevosCasos);
        } else {
          console.log(response?.mensaje || 'Sin casos cerrados.');
          this.hayMasCasos = false;
        }

        // Esperar un poco antes de permitir nueva carga
        setTimeout(() => {
          this.cargandoMasCasos = false;
          this.cdr.detectChanges();
        }, 500);
      },
      error: error => {
        console.error('Error al cargar casos cerrados:', error);
        this.cargandoMasCasos = false;
        this.hayMasCasos = false;
        this.cdr.detectChanges();
      }
    });
  }

  private agregarCasos(nuevosCasos: any[]): void {
    this.todosLosCasos = [...this.casos, ...nuevosCasos];
    this.casos = [...this.todosLosCasos];
    this.ordenarCasosPorFecha();
  }

  private ordenarCasosPorFecha(): void {
    this.casos.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  abrirChat(caso: Caso): void {
    // Marcar el caso como visto (resetear contador de mensajes no leídos)
    if (caso.mensajesNoLeidos > 0) {
      this.casosService.marcarCasoComoVisto(caso.id).subscribe({
        next: () => {
          // Resetear el contador localmente
          caso.mensajesNoLeidos = 0;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al marcar caso como visto:', error);
        }
      });
    }

    // Solo atender caso automáticamente si estamos en vista "en-proceso" y el estado es 0
    if(this.tipoVista === 'en-proceso' && caso.estado === 0) {
      // Primero atender el caso y luego abrir el chat
      caso.estado = 1;
      this.atenderCaso(caso.id, () => {
        // Esperar 1 segundo y luego recargar el caso actualizado
        setTimeout(() => {
          this.recargarCasoActualizado(caso.id);
        }, 1000);
      });
    } else {
      // Si el caso ya está atendido o es cerrado, abrir directamente
      this.casoSeleccionado = caso;
      sessionStorage.setItem(`chatAbierto_${this.tipoVista}`, caso.id);
    }
  }

  private recargarCasoActualizado(casoId: string): void {
    // Usar forkJoin para obtener ambos estados en paralelo (mismo patrón que cargarCasosEnProceso)
    forkJoin({
      enProceso: this.casosService.getCasosPorEstado(0, 0, 10).pipe(
        catchError(error => {
          console.warn('Error al recargar casos en proceso:', error);
          return of({ listadoCasos: [] });
        })
      ),
      abiertos: this.casosService.getCasosPorEstado(1, 0, 10).pipe(
        catchError(error => {
          console.warn('Error al recargar casos abiertos:', error);
          return of({ listadoCasos: [] });
        })
      )
    }).subscribe(({ enProceso, abiertos }) => {
      const todosLosCasos = [
        ...(enProceso?.listadoCasos || []),
        ...(abiertos?.listadoCasos || [])
      ];

      // Encontrar el caso actualizado
      const casoActualizado = todosLosCasos.find(c => c.id === casoId);

      if (casoActualizado) {
        // Actualizar el caso en la lista local
        const index = this.casos.findIndex(c => c.id === casoId);
        if (index !== -1) {
          this.casos[index] = casoActualizado;
        }

        // Abrir el chat con el caso actualizado
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

    // Limpiar el chat abierto del sessionStorage
    sessionStorage.removeItem(`chatAbierto_${this.tipoVista}`);
  }

  cerrarCaso(casoId: string): void {
    if (confirm('¿Está seguro de cerrar este caso?')) {
      this.casosService.cerrarCaso(casoId).subscribe({
        next: response => {
          if (this.casoSeleccionado?.id === casoId) {
            this.cerrarChat();
          }

          this.casos = this.casos.filter(caso => caso.id !== casoId);

          this.cdr.detectChanges();

          alert('Caso cerrado exitosamente')
        },
        error: err => {
          console.error('Error al cerrar el caso:', err);
          alert('Hubo un error al cerrar el caso');
        }
      });
    }
  }

  private cargarUltimosMensajes(casos: Caso[]): void {
    // Crear un array de observables para obtener los últimos mensajes de cada caso
    const requests = casos.map(caso =>
      this.mensajesService.getUltimoMensajeChat(caso.id).pipe(
        catchError(error => {
          console.warn(`Error al obtener último mensaje del caso ${caso.id}:`, error);
          return of(null);
        })
      )
    );

    // Ejecutar todas las peticiones en paralelo
    forkJoin(requests).subscribe(responses => {
      responses.forEach((response, index) => {
        if (response?.mensaje) {
          const caso = casos[index];
          const fecha = new Date(response.mensaje.fecha);

          // Formatear la fecha
          const day = fecha.getDate();
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const month = months[fecha.getMonth()];
          const hours = fecha.getHours();
          const minutes = fecha.getMinutes();
          const ampm = hours >= 12 ? 'pm' : 'am';
          const hours12 = hours % 12 || 12;
          const minutesStr = minutes < 10 ? '0' + minutes : minutes;
          const fechaFormateada = `${day}/${month} ${hours12}:${minutesStr}${ampm}`;

          // Guardar en el Map
          this.ultimosMensajes.set(caso.id, {
            texto: response.mensaje.mensaje || '',
            fecha: fechaFormateada
          });
        }
      });

      // Forzar detección de cambios
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
    if (nuevoMensaje) {
      // Obtener el casoId del mensaje (puede venir del chat abierto o de cualquier otro caso)
      const casoId = nuevoMensaje.casoId || this.casoSeleccionado?.id;

      if (!casoId) return;

      // Formatear la fecha del nuevo mensaje
      const fecha = new Date(nuevoMensaje.fecha);
      const day = fecha.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[fecha.getMonth()];
      const hours = fecha.getHours();
      const minutes = fecha.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const hours12 = hours % 12 || 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const fechaFormateada = `${day}/${month} ${hours12}:${minutesStr}${ampm}`;

      // Actualizar el Map con el nuevo mensaje
      this.ultimosMensajes.set(casoId, {
        texto: nuevoMensaje.mensaje || '',
        fecha: fechaFormateada
      });

      // Si el mensaje NO es del chat abierto actualmente, incrementar contador
      // Solo incrementar si el mensaje es del USUARIO (no del asesor)
      if (this.casoSeleccionado?.id !== casoId && nuevoMensaje.esDelUsuario !== false) {
        const casoIndex = this.casos.findIndex(c => c.id === casoId);
        if (casoIndex !== -1) {
          this.casos[casoIndex].mensajesNoLeidos = (this.casos[casoIndex].mensajesNoLeidos || 0) + 1;
        }
      }

      // Forzar detección de cambios
      this.cdr.detectChanges();
    }
  }

  cambiarEstado(event: Event, caso: Caso): void {
    event.stopPropagation();
    // Aquí puedes agregar la lógica para actualizar el estado en el backend
    console.log('Estado cambiado:', caso.estado, typeof caso.estado);
    if (+caso.estado === 0) {
      alert("No se puede volver a poner como sin atender");
      caso.estado = 1;
    }
    else if (+caso.estado === 1) this.atenderCaso(caso.id);
    else if (+caso.estado === 2) this.cerrarCaso(caso.id);
  }

  atenderCaso(casoId: string, callback?: () => void): void {
    this.asesorService.atenderCaso(casoId).subscribe({
      next: response => {
        alert('Caso atendido exitosamente');
        // Si hay callback, ejecutarlo (usado cuando se abre el chat)
        if (callback) {
          callback();
        } else {
          // Si no hay callback, mostrar alerta y recargar casos (cambio de estado manual)
          alert('Caso atendido exitosamente');
          this.cargarCasos();
        }
      },
      error: error => {
        // Si hay error, volver a cargar los casos para reflejar el estado real
        console.error('Error al atender caso:', error);
        this.cargarCasos();
      }
    });
  }

  filtrarCasos(): void {
    const texto = this.filtro.trim();

    if (texto === '') {
      // Si el filtro está vacío, volver al listado normal
      this.enModoBusqueda = false;
      this.resetearPaginacion();
      this.cargarCasos();
    } else {
      // Emitir el término de búsqueda al Subject (se procesará con debounce)
      this.busquedaSubject.next(texto);
    }
  }

  private realizarBusqueda(termino: string): void {
    // Si el término está vacío, no hacer nada (ya se maneja en filtrarCasos)
    if (termino.trim() === '') {
      return;
    }

    // Activar modo búsqueda y resetear paginación
    this.enModoBusqueda = true;
    this.resetearPaginacion();

    // Cargar resultados de búsqueda
    this.cargarResultadosBusqueda(termino);
  }

  private cargarResultadosBusqueda(termino: string): void {
    if (this.cargandoMasCasos || !this.hayMasCasos) return;

    this.cargandoMasCasos = true;

    if (this.tipoVista === 'en-proceso') {
      // Buscar en casos estado 0 y 1
      forkJoin({
        enProceso: this.casosService.buscarCasosPorCelular(termino, 0, this.paginaActual, this.tamanoPagina).pipe(
          catchError(error => {
            console.warn('Error al buscar casos en proceso:', error);
            return of({ listadoCasos: [], mensaje: 'Sin resultados en proceso.' });
          })
        ),
        abiertos: this.casosService.buscarCasosPorCelular(termino, 1, this.paginaActual, this.tamanoPagina).pipe(
          catchError(error => {
            console.warn('Error al buscar casos abiertos:', error);
            return of({ listadoCasos: [], mensaje: 'Sin resultados abiertos.' });
          })
        )
      }).subscribe(({ enProceso, abiertos }) => {
        const nuevosCasos: any[] = [];

        if (enProceso?.listadoCasos) {
          nuevosCasos.push(...enProceso.listadoCasos);
        }

        if (abiertos?.listadoCasos?.length) {
          nuevosCasos.push(...abiertos.listadoCasos);
        }

        // Verificar si hay más casos para cargar
        this.hayMasCasos = nuevosCasos.length === this.tamanoPagina;

        // Agregar casos sin duplicados
        this.agregarCasos(nuevosCasos);

        // Incrementar página para la próxima carga
        this.paginaActual++;

        // Cargar últimos mensajes y tipos
        this.cargarUltimosMensajes(nuevosCasos);
        this.cargarTiposDeCasos(nuevosCasos);

        // Esperar antes de permitir nueva carga
        setTimeout(() => {
          this.cargandoMasCasos = false;
          this.cdr.detectChanges();
        }, 500);
      });
    } else {
      // Buscar en casos cerrados (estado 2)
      this.casosService.buscarCasosPorCelular(termino, 2, this.paginaActual, this.tamanoPagina).subscribe({
        next: response => {
          if (response?.listadoCasos) {
            const nuevosCasos = response.listadoCasos;

            // Verificar si hay más casos para cargar
            this.hayMasCasos = nuevosCasos.length === this.tamanoPagina;

            // Agregar casos sin duplicados
            this.agregarCasos(nuevosCasos);

            // Incrementar página para la próxima carga
            this.paginaActual++;

            // Cargar últimos mensajes y tipos
            this.cargarUltimosMensajes(nuevosCasos);
            this.cargarTiposDeCasos(nuevosCasos);
          } else {
            this.hayMasCasos = false;
          }

          // Esperar antes de permitir nueva carga
          setTimeout(() => {
            this.cargandoMasCasos = false;
            this.cdr.detectChanges();
          }, 500);
        },
        error: error => {
          console.error('Error al buscar casos cerrados:', error);
          this.cargandoMasCasos = false;
          this.hayMasCasos = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  abrirModalNuevoChat(): void {
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  onCasoCreado(caso: any): void {
    this.abrirChat(caso);
  }

  obtenerTipo(caso: Caso): string {
    // Solo retornar del cache, nunca hacer peticiones HTTP aquí
    if (this.tiposCache.has(caso.tipoId)) {
      return this.tiposCache.get(caso.tipoId)!.nombre;
    }

    // Si no está en cache, retornar placeholder
    // (los tipos deberían cargarse previamente en cargarTiposDeCasos)
    return 'Cargando...';
  }

  private cargarTiposDeCasos(casos: Caso[]): void {
    // Obtener los tipoIds únicos que no están en cache
    const tiposIdsUnicos = [...new Set(casos.map(c => c.tipoId))];
    const tiposIdsNoEnCache = tiposIdsUnicos.filter(id => !this.tiposCache.has(id));

    // Si no hay tipos para cargar, salir
    if (tiposIdsNoEnCache.length === 0) {
      return;
    }

    // Crear un array de observables para cargar todos los tipos en paralelo
    const requests = tiposIdsNoEnCache.map(tipoId =>
      this.tiposService.obtenerTipoPorId(tipoId).pipe(
        catchError(error => {
          console.error(`Error al obtener tipo ${tipoId}:`, error);
          return of(null);
        })
      )
    );

    // Ejecutar todas las peticiones en paralelo
    forkJoin(requests).subscribe(responses => {
      responses.forEach((response, index) => {
        if (response?.Tipo) {
          const tipoId = tiposIdsNoEnCache[index];
          this.tiposCache.set(tipoId, response.Tipo);
        }
      });

      // Forzar detección de cambios una sola vez
      this.cdr.detectChanges();
    });
  }

  // Getter para saber si estamos en modo solo lectura (casos cerrados)
  get esModoSoloLectura(): boolean {
    return this.tipoVista === 'cerrados';
  }

  // Getter para el mensaje vacío
  get mensajeVacio(): string {
    return this.tipoVista === 'en-proceso'
      ? 'No hay casos asignados'
      : 'No hay casos cerrados';
  }

  // Getter para la imagen del avatar
  get imagenAvatar(): string {
    return this.tipoVista === 'en-proceso'
      ? 'assets/loloDuda.png'
      : 'assets/loloFin.png';
  }
}

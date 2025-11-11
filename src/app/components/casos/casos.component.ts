import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';
import { NuevaConversacionComponent } from '../nueva-conversacion/nueva-conversacion.component';
import { WebSocketService } from '../../services/websocket.service';
import { forkJoin } from 'rxjs';
import { AdministradoresService } from '../../services/administradores.service';

type TipoVista = 'en-proceso' | 'cerrados';

@Component({
  selector: 'app-casos',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent, NuevaConversacionComponent],
  templateUrl: './casos.component.html',
  styleUrls: ['./casos.component.scss']
})
export class CasosComponent implements OnInit {
  casos: Caso[] = [];
  casoSeleccionado: Caso | null = null;
  ultimosMensajes: Map<string, string> = new Map();

  filtro: string = '';
  todosLosCasos: Caso[] = [];

  // Modal para nuevo chat (solo en vista "en-proceso")
  mostrarModal: boolean = false;

  idAsesor: string = '';

  // Propiedad que determina qué vista mostrar
  tipoVista: TipoVista = 'en-proceso';

  constructor(
    private casosService: CasosService,
    private adminService: AdministradoresService,
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService,
    private ngZone: NgZone,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
    this.idAsesor = usuarioEntidad?.numeroDocumento || '';

    // Detectar el tipo de vista desde la ruta
    this.route.data.subscribe(data => {
      this.tipoVista = data['tipo'] || 'en-proceso';
      this.cargarCasos();

      // Solo inicializar WebSocket si estamos en vista "en-proceso"
      if (this.tipoVista === 'en-proceso') {
        this.inicializarWebSockets();
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
    }
  }

  private inicializarWebSockets(): void {
    // WebSocket para mostrar nuevos casos que aparecen
    this.wsService.obtenerNuevosCasos().subscribe(newCaso => {
      console.log('Nuevo caso recibido:', newCaso);
      // Solo agregar si no existe ya en la lista
      const existe = this.casos.some(c => c.id === newCaso.id);
      if (!existe) {
        this.ngZone.run(() => {
          this.todosLosCasos = [...this.casos, newCaso];
          this.casos = [...this.todosLosCasos];
          console.log('Casos actualizados:', this.casos);

          this.cdr.markForCheck();
        })
      }
    });

    // WebSocket para casos atendidos (actualizar estado)
    this.wsService.suscribirACasosAtendidos().subscribe(casoAtendido => {
      console.log('Caso atendido:', casoAtendido);
      const casoIndex = this.casos.findIndex(c => c.id === casoAtendido.id);
      if (casoIndex !== -1) {
        this.casos[casoIndex].estado = 1;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCasos(): void {
    if (this.tipoVista === 'en-proceso') {
      this.cargarCasosEnProceso();
    } else {
      this.cargarCasosCerrados();
    }
  }

  private cargarCasosEnProceso(): void {
    // Obtener casos estado 0 y 1
    forkJoin({
      enProceso: this.casosService.getCasosEnProceso(),
      abiertos: this.casosService.getCasosAbiertos()
    }).subscribe(({ enProceso, abiertos }) => {
      const nuevosCasos: any[] = [];

      if (enProceso?.casosEnProceso) {
        nuevosCasos.push(...enProceso.casosEnProceso);
        console.log(enProceso.mensaje);
      } else {
        console.log(enProceso?.mensaje || 'Sin casos en proceso.');
      }

      if (abiertos?.casosAbiertos) {
        nuevosCasos.push(...abiertos.casosAbiertos);
        console.log(abiertos.mensaje);
      } else {
        console.log(abiertos?.mensaje || 'Sin casos abiertos.');
      }

      // Limpiar el array antes de agregar para evitar duplicados
      this.casos = [];
      this.agregarCasos(nuevosCasos);
    });
  }

  private cargarCasosCerrados(): void {
    this.casosService.getCasosCerrados().subscribe({
      next: response => {
        if (response?.casosTerminados) {
          this.todosLosCasos = response.casosTerminados;
          this.casos = [...this.todosLosCasos];
          this.ordenarCasosPorFecha();
          console.log(response.mensaje);
        } else {
          console.log(response?.mensaje || 'Sin casos cerrados.');
        }
      },
      error: error => {
        console.error('Error al cargar casos cerrados:', error);
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
    this.casoSeleccionado = caso;

    // Solo atender caso automáticamente si estamos en vista "en-proceso" y el estado es 0
    if(this.tipoVista === 'en-proceso' && this.casoSeleccionado.estado === 0) {
      this.casoSeleccionado.estado = 1;
      this.atenderCaso(caso.id);
    }
  }

  cerrarChat(): void {
    this.casoSeleccionado = null;
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

  obtenerHora(caso: Caso): string {
    // Obtener la fecha del último mensaje
    const tieneMensajes = Array.isArray(caso.mensajes) && caso.mensajes.length > 0;
    const fecha = tieneMensajes
      ? caso.mensajes[caso.mensajes.length - 1].fecha
      : caso.fecha;

    const date = new Date(fecha);
    const day = date.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[date.getMonth()];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${day}/${month} ${hours12}:${minutesStr}${ampm}`;
  }

  obtenerUltimoMensaje(caso: Caso): string {
    if (!Array.isArray(caso.mensajes) || caso.mensajes.length === 0) {
      return '(Sin mensajes)';
    }
    return caso.mensajes[caso.mensajes.length - 1].mensaje;
  }

  actualizarUltimoMensaje(nuevoMensaje: any): void {
    // Buscar el caso en la lista y actualizar su último mensaje
    const casoIndex = this.casos.findIndex(c => c.id === this.casoSeleccionado?.id);
    if (casoIndex !== -1) {
      if (!Array.isArray(this.casos[casoIndex].mensajes)) {
        this.casos[casoIndex].mensajes = [];
      }
      this.casos[casoIndex].mensajes.push(nuevoMensaje);
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

  atenderCaso(casoId: string): void {
    this.adminService.atenderCaso(casoId).subscribe({
      next: response => {
        alert('Caso atendido exitosamente');
        this.cargarCasos();
      },
      error: error => {
        // Si hay error, volver a cargar los casos para reflejar el estado real
        console.error('Error al atender caso:', error);
        this.cargarCasos();
      }
    });
  }

  filtrarCasos(): void {
    const texto = this.filtro.trim().toLowerCase();

    if(texto === ''){
      this.casos = [...this.todosLosCasos];
    } else {
      this.casos = this.todosLosCasos.filter(caso =>
        caso.numeroUsuario.toString().toLowerCase().includes(texto)
      )
    }

    this.ordenarCasosPorFecha();
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

import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';
import { WebSocketService } from '../../services/websocket.service';
import { forkJoin } from 'rxjs';
import { MensajesService } from '../../services/mensajes.service';
import { AdministradoresService } from '../../services/administradores.service';
import { TiposService } from '../../services/tipos.service';

@Component({
  selector: 'app-casos-asignados',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './casos-en-proceso.component.html',
  styleUrls: ['./casos-en-proceso.component.scss']
})
export class CasosEnProcesoComponent implements OnInit {
  casos: Caso[] = [];
  casoSeleccionado: Caso | null = null;
  ultimosMensajes: Map<string, string> = new Map();

  filtro: string = '';
  todosLosCasos: Caso[] = [];

  // Modal para nuevo chat
  mostrarModal: boolean = false;
  numeroUsuario: string = '';
  tipoSeleccionado: any = null;
  tiposCaso: any[] = []; // Aquí cargarás los tipos desde tu endpoint

  constructor(
    private casosService: CasosService,
    private adminService: AdministradoresService,
    private tiposService: TiposService,
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.cargarCasos();

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

  cargarCasos(): void {
    // Obtener casos estado 0 y 1
    forkJoin({
      enProceso: this.casosService.getCasosEnProceso("1001117847"),
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
    if(this.casoSeleccionado.estado === 0) {
      this.casoSeleccionado.estado = 1;
      this.atenderCaso(caso.id);
    }
  }

  cerrarChat(): void {
    this.casoSeleccionado = null;
  }

  cerrarCaso(casoId: string): void {
    if (confirm('¿Está seguro de cerrar este caso?')) {
      this.casosService.cerrarCaso(casoId, "1001117847").subscribe({
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
    this.adminService.atenderCaso(casoId, '1001117847').subscribe({
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

    this.tiposService.getTipos().subscribe({
      next: response => {
        this.tiposCaso = response.listaTipos || [];
      }, error: error => {
        console.error('Error al cargar los tipos de caso:', error);
      }
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.numeroUsuario = '';
    this.tipoSeleccionado = null;
  }

  empezarChat(): void {
    if (!this.numeroUsuario.trim() || !this.tipoSeleccionado) {
      alert('Por favor complete todos los campos');
      return;
    }

    alert(`Creando caso para el número ${this.numeroUsuario} con tipo ${this.tipoSeleccionado.nombre}`);

    this.casosService.crearNuevoCaso(this.numeroUsuario, this.tipoSeleccionado.nombre).subscribe({
      next: response => {
        console.log(response.mensaje);
        console.log('Caso creado:', response.caso);
        this.cerrarModal();
        this.abrirChat(response.caso);
      }, error: error => {
        console.error('Error al crear el caso:', error);
        alert('Error al crear el caso');
      }
    });

    console.log('Crear caso con:', this.numeroUsuario, this.tipoSeleccionado);
    this.cerrarModal();
  }
}

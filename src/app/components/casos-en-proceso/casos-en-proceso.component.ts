import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';
import { WebSocketService } from '../../services/websocket.service';
import { forkJoin } from 'rxjs';

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

  constructor(
    private casosService: CasosService,
    private cdr: ChangeDetectorRef,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.cargarCasos();
    
    // WebSocket para mostrar nuevos casos que aparecen
    this.wsService.obtenerNuevosCasos().subscribe(newCaso => {
      console.log('Nuevo caso recibido:', newCaso);
      this.agregarCasos([newCaso]);
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

      this.agregarCasos(nuevosCasos);
    });
  }

  private agregarCasos(nuevosCasos: any[]): void {
    this.casos.push(...nuevosCasos);
    this.ordenarCasosPorFecha();
    this.cdr.detectChanges(); // Si realmente lo necesitas
  }

  private ordenarCasosPorFecha(): void {
    this.casos.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
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
          this.cargarCasos();
          if (this.casoSeleccionado?.id === casoId) {
            this.cerrarChat();
          }
        }
      });
    }
  }

  obtenerHora(fecha: Date): string {
    const date = new Date(fecha);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours12}:${minutesStr}${ampm}`;
  }

  obtenerUltimoMensaje(caso: Caso): string {
    return caso.mensajes[caso.mensajes.length - 1].mensaje;
  }

  actualizarUltimoMensaje(nuevoMensaje: any): void {
    // Buscar el caso en la lista y actualizar su último mensaje
    const casoIndex = this.casos.findIndex(c => c.id === this.casoSeleccionado?.id);
    if (casoIndex !== -1) {
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
    this.casosService.atenderCaso(casoId, '1001117847').subscribe({
      next: response => {
        alert('Caso atendido exitosamente');
      },
      error: error => {
        // Si hay error, volver a cargar los casos para reflejar el estado real
        console.error('Error al atender caso:', error);
        this.cargarCasos();
      }
    });
  }
}

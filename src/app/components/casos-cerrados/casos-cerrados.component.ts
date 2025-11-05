import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-casos-cerrados',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './casos-cerrados.component.html',
  styleUrls: ['./casos-cerrados.component.scss']
})
export class CasosCerradosComponent implements OnInit {
  casos: Caso[] = [];
  casoSeleccionado: Caso | null = null;

  filtro: string = '';
  todosLosCasos: Caso[] = [];

  constructor(
    private casosService: CasosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCasosCerrados();
  }

  cargarCasosCerrados(): void {
    const usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
    const idAdmin = usuarioEntidad?.numeroDocumento || '';
    this.casosService.getCasosCerrados(idAdmin).subscribe({
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

  private ordenarCasosPorFecha(): void {
    this.casos.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }

  abrirChat(caso: Caso): void {
    this.casoSeleccionado = caso;
  }

  cerrarChat(): void {
    this.casoSeleccionado = null;
  }

  obtenerHora(caso: Caso): string {
    // Obtener la fecha del último mensaje
    const ultimoMensaje = caso.mensajes[caso.mensajes.length - 1];
    const fecha = ultimoMensaje?.fecha || caso.fecha;

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
}

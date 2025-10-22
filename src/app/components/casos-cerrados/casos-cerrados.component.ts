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

  constructor(
    private casosService: CasosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarCasosCerrados();
  }

  cargarCasosCerrados(): void {
    this.casosService.getCasosCerrados("1001117847").subscribe({
      next: response => {
        if (response?.casosTerminados) {
          this.casos = response.casosTerminados;
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

  obtenerHora(fecha: Date): string {
    const date = new Date(fecha);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours12}:${minutesStr}${ampm}`;
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-casos-asignados',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './casos-en-proceso.component.html',
  styleUrls: ['./casos-en-proceso.component.scss']
})
export class CasosEnProcesoComponent implements OnInit {
  casos: Caso[] = [];
  casoSeleccionado: Caso | null = null;

  constructor(private casosService: CasosService) {}

  ngOnInit(): void {
    this.cargarCasos();
  }

  cargarCasos(): void {
    this.casosService.getCasosEnProceso("1001117847").subscribe({
      next: response => {
        if (response.casosEnProceso == null) {
          alert(response.mensaje);
        } else {
          this.casos = response.casosEnProceso;
          console.log(response.mensaje);
        }
        
      }
    });
  }

  abrirChat(caso: Caso): void {
    this.casoSeleccionado = caso;
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
}

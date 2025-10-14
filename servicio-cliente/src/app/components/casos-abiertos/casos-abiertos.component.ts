import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-casos-sin-resolver',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './casos-abiertos.component.html',
  styleUrls: ['./casos-abiertos.component.scss']
})
export class CasosAbiertosComponent implements OnInit {
  casos: Caso[] = [];
  chatAbierto: boolean = false;
  casoSeleccionado: Caso | null = null;

  constructor(private casosService: CasosService) {}

  ngOnInit(): void {
    this.cargarCasos();
  }

  cargarCasos(): void {
    this.casosService.getCasosAbiertos().subscribe({
      next: response => {
        if (response.casosAbiertos == null) { 
          alert(response.mensaje);
        }
        else { 
          this.casos = response.casosAbiertos;
          console.log(response.mensaje);
        }
      }
    });
  }

  atenderCaso(casoId: string): void {
    this.casosService.atenderCaso(casoId, '1001117847').subscribe({
      next: response => {
        // Buscar el caso completo con sus mensajes
        const caso = this.casos.find(c => c.id === casoId);
        if (caso) {
          this.casoSeleccionado = caso;
          this.chatAbierto = true;
        }
        alert('Caso atendido exitosamente');
      }
    });
  }

  cerrarChat(): void {
    this.chatAbierto = false;
    this.casoSeleccionado = null;
  }
}

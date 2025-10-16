import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-casos-sin-resolver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './casos-abiertos.component.html',
  styleUrls: ['./casos-abiertos.component.scss']
})
export class CasosAbiertosComponent implements OnInit {
  casos: Caso[] = [];

  constructor(
    private casosService: CasosService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarCasos();

    this.wsService.obtenerNuevosCasos().subscribe(
      (newMensaje) => {
        console.log('Nuevo mensaje recibido: ', newMensaje);
        this.casos.push(newMensaje);
        this.cdr.detectChanges();
      }
    )
  }

  cargarCasos(): void {
    this.casosService.getCasosAbiertos().subscribe({
      next: response => {
        if (response.casosAbiertos == null) { 
          console.log(response.mensaje);
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
        alert('Caso atendido exitosamente');
        // Navegar a casos-en-proceso con el ID del caso
        this.router.navigate(['/casos-en-proceso'], {
          state: { casoId: casoId }
        });
      }
    });
  }
}

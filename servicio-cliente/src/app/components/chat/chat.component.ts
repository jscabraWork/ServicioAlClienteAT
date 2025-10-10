import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { Mensaje } from '../../models/mensaje.model';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  @Input() caso!: Caso;
  @Output() cerrar = new EventEmitter<void>();

  mensajes: Mensaje[] = [];
  nuevoMensaje: string = '';

  constructor(
    private casosService: CasosService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.cargarMensajes();

    this.wsService.suscribirACaso(this.caso.id).subscribe(
      (newMensaje) => {
        console.log('Nuevo mensaje recibido: ', newMensaje);
        this.mensajes.push(newMensaje);
      }
    )
  }

  cargarMensajes(): void {
    this.casosService.getMensajesPorCaso(this.caso.id).subscribe({
      next: response => {
        this.mensajes = response.mensajes;
      }
    });
  }

  enviarMensaje(): void {
    if (this.nuevoMensaje.trim()) {
      this.casosService.enviarMensaje(this.caso.id, "1001117847", this.nuevoMensaje).subscribe({
        next: response => {
          this.mensajes.push(response.mensajeEnviado);
          this.nuevoMensaje = '';
        }
      });
    }
  }

  cerrarChat(): void {
    this.cerrar.emit();
  }
}

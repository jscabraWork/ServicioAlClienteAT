import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { Mensaje } from '../../models/mensaje.model';
import { WebSocketService } from '../../services/websocket.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @Input() caso!: Caso;
  @Output() cerrar = new EventEmitter<void>();
  @ViewChild('chatMensajes') private chatMensajesContainer!: ElementRef;

  mensajes: Mensaje[] = [];
  nuevoMensaje: string = '';
  private debeHacerScroll = false;

  constructor(
    private sanitizer: DomSanitizer,
    private casosService: CasosService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarMensajes();

    this.wsService.suscribirACaso(this.caso.id).subscribe(
      (newMensaje) => {
        console.log('Nuevo mensaje recibido: ', newMensaje);
        this.mensajes.push(newMensaje);
        this.debeHacerScroll = true;
        this.cdr.detectChanges();
      }
    )
  }

  ngAfterViewChecked(): void {
    if (this.debeHacerScroll) {
      this.scrollAlFinal();
    }
  }

  private scrollAlFinal(): void {
    try {
      // Usar setTimeout para asegurar que el DOM se ha actualizado completamente
      setTimeout(() => {
        const container = this.chatMensajesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }, 0);

      // También agregar un segundo intento después de que las imágenes puedan haber cargado
      setTimeout(() => {
        const container = this.chatMensajesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }, 100);

      this.debeHacerScroll = false;
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  onImagenCargada(): void {
    // Cuando una imagen termina de cargar, hacer scroll al final
    try {
      const container = this.chatMensajesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error al hacer scroll después de cargar imagen:', err);
    }
  }
  // Método para convertir array de bytes a Base64
  arrayBufferToBase64(bytes: number[]): string {
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }


  getMediaUrl(mensaje: Mensaje): any {
    return this.casosService.obtenerMediaCompleto(mensaje.mediaId);
  }

  // getAudioUrl(mensaje: Mensaje): SafeUrl {
  //   const mimeType = mensaje.tipoContenido + '/ogg';
  //   const dataUrl = `data:${mimeType};base64,${mensaje.mediaId}`;

  //   return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  // }

  // getVideoUrl(mensaje: Mensaje): SafeUrl {
  //   const mimeType = mensaje.tipoContenido + '/mp4';
  //   const dataUrl = `data:${mimeType};base64,${mensaje.mediaId}`;

  //   return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  // }

  cargarMensajes(): void {
    this.casosService.getMensajesPorCaso(this.caso.id).subscribe({
      next: response => {
        this.mensajes = response.mensajes;
        this.debeHacerScroll = true;
      }
    });
  }

  enviarMensaje(): void {
    if (this.nuevoMensaje.trim()) {
      this.casosService.enviarMensaje(this.caso.id, "1001117847", this.nuevoMensaje).subscribe({
        next: response => {
          console.log(response.mensajeEnviado);
          this.nuevoMensaje = '';
          this.debeHacerScroll = true;
        }
      });
    }
  }

  cerrarChat(): void {
    this.cerrar.emit();
  }
}

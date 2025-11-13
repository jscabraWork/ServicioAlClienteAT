import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CasosService } from '../../services/casos.service';
import { Caso } from '../../models/caso.model';
import { Mensaje } from '../../models/mensaje.model';
import { WebSocketService } from '../../services/websocket.service';
import { MensajesService } from '../../services/mensajes.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() caso!: Caso;
  @Input() modoSoloLectura: boolean = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() nuevoMensajeRecibido = new EventEmitter<Mensaje>();
  @ViewChild('chatMensajes') private chatMensajesContainer!: ElementRef;

  mensajes: Mensaje[] = [];
  nuevoMensaje: string = '';
  private debeHacerScroll = false;

  // Propiedades para multimedia
  archivoSeleccionado: File | null = null;
  readonly MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB en bytes

  // Propiedades para grabación de audio
  grabandoAudio: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  tiempoGrabacion: number = 0;
  intervaloGrabacion: any;

  // Propiedades para modal de multimedia
  modalAbierto: boolean = false;
  modalUrl: any = null;
  modalTipo: 'image' | 'video' | null = null;

  nombreAsesor: string='';
  idAsesor: string = '';

  paginaActual: number = 0;
  tamanoPagina: number = 20
  cargandoMasMensajes: boolean = false;
  hayMasMensajes: boolean = true;
  private scrollTimeout: any = null;

  constructor(
    private casosService: CasosService,
    private mensajesService: MensajesService,
    private wsService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
    this.idAsesor = usuarioEntidad?.numeroDocumento || '';
    this.cargarMensajes(true);

    // Solo suscribirse a WebSocket si NO está en modo solo lectura
    if (!this.modoSoloLectura) {
      this.wsService.suscribirACaso(this.caso.id).subscribe(
        (newMensaje) => {
          console.log('Nuevo mensaje recibido: ', newMensaje);
          // Ejecutar dentro de NgZone para asegurar que los event listeners funcionen correctamente
          this.ngZone.run(() => {
            this.mensajes = [...this.mensajes, newMensaje];
            this.nuevoMensajeRecibido.emit(newMensaje);
            this.debeHacerScroll = true;
          });
        }
      )
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cuando cambia el caso y recargar los mensajes
    if (changes['caso'] && !changes['caso'].firstChange) {
      this.cargarMensajes();
    }
  }

  ngAfterViewInit(): void {
    if (this.chatMensajesContainer) {
      const container = this.chatMensajesContainer.nativeElement;

      container.addEventListener('scroll', () => {
        // Si ya está cargando, no hacer nada
        if (this.cargandoMasMensajes) {
          return;
        }

        // Limpiar timeout anterior si existe
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }

        // Esperar 150ms después del último evento de scroll antes de verificar
        this.scrollTimeout = setTimeout(() => {
          // Cargar cuando estés muy cerca del tope (dentro de los primeros 20px)
          if(container.scrollTop <= 20 && this.hayMasMensajes && !this.cargandoMasMensajes) {
            this.cargarMensajes(false);
          }
        }, 150);
      })
    }
  }

  ngAfterViewChecked(): void {
    if (this.debeHacerScroll) {
      this.scrollAlFinal();
    }
  }

  private scrollAlFinal(): void {
    try {
      // Usar requestAnimationFrame para mejor sincronización con el render
      requestAnimationFrame(() => {
        const container = this.chatMensajesContainer.nativeElement;
        // Usar scrollTop directo en lugar de scrollTo smooth para evitar interferencias con clicks
        container.scrollTop = container.scrollHeight;
      });

      this.debeHacerScroll = false;
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  onImagenCargada(): void {
    // Cuando una imagen termina de cargar, hacer scroll al final
    try {
      requestAnimationFrame(() => {
        const container = this.chatMensajesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      });
    } catch (err) {
      console.error('Error al hacer scroll después de cargar imagen:', err);
    }
  }

  onVideoLoaded(event: Event): void {
    // Cuando el video carga los metadatos, mostrar el primer frame
    const video = event.target as HTMLVideoElement;
    video.currentTime = 0.1; // Cargar un frame inicial para la miniatura
  }

  getMediaUrl(mensaje: Mensaje): any {
    return this.mensajesService.obtenerMediaCompleto(mensaje.mediaId);
  }

  cargarMensajes(inicial: boolean = true): void {
    if(this.cargandoMasMensajes || !this.hayMasMensajes) return;

    if (inicial) {
      // Carga inicial: cargar inmediatamente sin animación prolongada
      this.cargandoMasMensajes = true;

      this.mensajesService.getMensajesPorCaso(this.caso.id, this.paginaActual, this.tamanoPagina).subscribe({
        next: response => {
          const mensajesNuevos = response.reverse();
          this.mensajes = mensajesNuevos;
          this.debeHacerScroll = true;
          this.hayMasMensajes = mensajesNuevos.length === this.tamanoPagina;
          this.paginaActual++;

          setTimeout(() => {
            this.cargandoMasMensajes = false;
          }, 500);
        },
        error: error => {
          this.cargandoMasMensajes = false;
        }
      });
    } else {
      // Carga de más mensajes: mostrar animación primero
      this.cargandoMasMensajes = true;

      this.mensajesService.getMensajesPorCaso(this.caso.id, this.paginaActual, this.tamanoPagina).subscribe({
        next: response => {
          const mensajesNuevos = response.reverse();

          // Esperar 1 segundo mostrando la animación
          setTimeout(() => {
            // Ocultar animación
            this.cargandoMasMensajes = false;

            // Después de ocultar la animación, agregar los mensajes
            setTimeout(() => {
              const container = this.chatMensajesContainer.nativeElement;
              const alturaAntes = container.scrollHeight;

              // Agregar nuevos mensajes al inicio
              this.mensajes = [...mensajesNuevos, ...this.mensajes];

              // Actualizar variables de paginación
              this.hayMasMensajes = mensajesNuevos.length === this.tamanoPagina;
              this.paginaActual++;

              // Forzar detección de cambios
              this.cdr.detectChanges();

              // Ajustar scroll para mantener posición
              setTimeout(() => {
                const alturaDespues = container.scrollHeight;
                container.scrollTop = alturaDespues - alturaAntes;
              }, 50);
            }, 100);
          }, 1000);
        },
        error: error => {
          setTimeout(() => {
            this.cargandoMasMensajes = false;
          }, 1000);
        }
      });
    }
  }

  // Comprimir imagen
  async comprimirImagen(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Reducir dimensiones si es necesario
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Comprimir iterativamente hasta que esté bajo 16MB
          let quality = 0.9;
          const compressRecursive = () => {
            canvas.toBlob((blob) => {
              if (blob) {
                if (blob.size <= this.MAX_FILE_SIZE || quality <= 0.1) {
                  const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                  console.log(`Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                  resolve(compressedFile);
                } else {
                  quality -= 0.1;
                  compressRecursive();
                }
              } else {
                reject(new Error('Error al comprimir imagen'));
              }
            }, 'image/jpeg', quality);
          };
          compressRecursive();
        };
        img.onerror = () => reject(new Error('Error al cargar imagen'));
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
    });
  }

  // Comprimir audio
  async comprimirAudio(file: File): Promise<File> {
    // Para audio, si excede 16MB, intentamos re-codificar a menor bitrate
    if (file.size <= this.MAX_FILE_SIZE) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const arrayBuffer = e.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // Re-codificar a menor sample rate
          const offlineContext = new OfflineAudioContext(
            1, // mono
            audioBuffer.duration * 22050, // 22.05kHz (menor calidad)
            22050
          );

          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();

          const renderedBuffer = await offlineContext.startRendering();

          // Convertir a blob
          const length = renderedBuffer.length * renderedBuffer.numberOfChannels * 2;
          const buffer = new ArrayBuffer(44 + length);
          const view = new DataView(buffer);

          // Escribir header WAV
          const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };

          writeString(0, 'RIFF');
          view.setUint32(4, 36 + length, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, renderedBuffer.numberOfChannels, true);
          view.setUint32(24, renderedBuffer.sampleRate, true);
          view.setUint32(28, renderedBuffer.sampleRate * renderedBuffer.numberOfChannels * 2, true);
          view.setUint16(32, renderedBuffer.numberOfChannels * 2, true);
          view.setUint16(34, 16, true);
          writeString(36, 'data');
          view.setUint32(40, length, true);

          // Escribir datos de audio
          const channelData = renderedBuffer.getChannelData(0);
          let offset = 44;
          for (let i = 0; i < channelData.length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
          }

          const blob = new Blob([buffer], { type: 'audio/wav' });
          const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.wav'), { type: 'audio/wav' });

          console.log(`Audio comprimido: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

          if (compressedFile.size <= this.MAX_FILE_SIZE) {
            resolve(compressedFile);
          } else {
            reject(new Error(`El audio es demasiado grande incluso después de comprimir. Tamaño: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`));
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error al leer audio'));
      reader.readAsArrayBuffer(file);
    });
  }

  async seleccionarArchivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log(`Imagen seleccionada: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      try {
        // Comprimir si es necesario
        if (file.size > this.MAX_FILE_SIZE) {
          console.log('Imagen excede 16MB, comprimiendo...');
          this.archivoSeleccionado = await this.comprimirImagen(file);
        } else {
          this.archivoSeleccionado = file;
        }

        if (this.archivoSeleccionado) {
          console.log('Imagen lista para enviar:', this.archivoSeleccionado.name);
        }
      } catch (error: any) {
        console.error('Error al procesar imagen:', error);
        alert(error.message || 'Error al procesar la imagen');
        this.archivoSeleccionado = null;
      }

      // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
      input.value = '';
    }
  }

  cancelarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  async toggleGrabarAudio(): Promise<void> {
    if (!this.grabandoAudio) {
      await this.iniciarGrabacion();
    } else {
      this.detenerGrabacion();
    }
  }

  async iniciarGrabacion(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.tiempoGrabacion = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/mpeg' });
        this.enviarAudio(audioBlob);

        // Detener todas las pistas del stream
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.grabandoAudio = true;

      // Contador de tiempo
      this.intervaloGrabacion = setInterval(() => {
        this.tiempoGrabacion++;
      }, 1000);

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  }

  detenerGrabacion(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.grabandoAudio = false;

      if (this.intervaloGrabacion) {
        clearInterval(this.intervaloGrabacion);
        this.intervaloGrabacion = null;
      }
    }
  }

  async enviarAudio(audioBlob: Blob): Promise<void> {
    let audioFile = new File([audioBlob], `audio_${Date.now()}.mpeg`, { type: 'audio/mpeg' });

    console.log(`Audio grabado: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);

    try {
      // Comprimir si excede 16MB
      if (audioFile.size > this.MAX_FILE_SIZE) {
        console.log('Audio excede 16MB, comprimiendo...');
        audioFile = await this.comprimirAudio(audioFile);
      }

      this.mensajesService.enviarMensajeConArchivo(this.caso.id, audioFile, 'audio').subscribe({
        next: (response: any) => {
          console.log('Audio enviado:', response);
          this.debeHacerScroll = true;
        },
        error: (error: any) => {
          console.error('Error al enviar audio:', error);
          alert('Error al enviar el audio');
        }
      });
    } catch (error: any) {
      console.error('Error al comprimir audio:', error);
      alert(error.message || 'Error al procesar el audio');
    }
  }

  enviarMensaje(): void {
    // Si hay una imagen seleccionada, enviarla
    if (this.archivoSeleccionado) {
      this.mensajesService.enviarMensajeConArchivo(
        this.caso.id,
        this.archivoSeleccionado,
        'image'
      ).subscribe({
        next: (response: any) => {
          console.log('Imagen enviada:', response);
          this.archivoSeleccionado = null;
          this.debeHacerScroll = true;
        },
        error: (error: any) => {
          console.error('Error al enviar imagen:', error);
          alert('Error al enviar la imagen');
        }
      });
    }
    // Si hay texto, enviar mensaje de texto
    else if (this.nuevoMensaje.trim()) {
      this.mensajesService.enviarMensaje(this.caso.id, this.nuevoMensaje).subscribe({
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

  trackByMensajeId(_index: number, mensaje: Mensaje): string {
    return mensaje.id;
  }

  abrirModal(event: Event, url: any, tipo: 'image' | 'video'): void {
    event.stopPropagation();
    event.preventDefault();
    this.modalUrl = url;
    this.modalTipo = tipo;
    this.modalAbierto = true;
    console.log('Modal abierto:', tipo, url);
  }

  cerrarModal(): void {
    this.modalAbierto = false;

    // Pausar video si estaba reproduciéndose
    if (this.modalTipo === 'video') {
      const videos = document.querySelectorAll('.modal-multimedia video');
      videos.forEach((video: any) => {
        video.pause();
        video.currentTime = 0;
      });
    }

    this.modalUrl = null;
    this.modalTipo = null;
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private audioNotificacion: HTMLAudioElement;
  private permisoNotificaciones: NotificationPermission = 'default';

  constructor() {
    // Crear elemento de audio para las notificaciones
    this.audioNotificacion = new Audio();

    // Intentar cargar sonido personalizado, si falla usar sonido generado
    this.audioNotificacion.src = 'assets/sounds/notification.mp3';
    this.audioNotificacion.load();

    // Si el archivo no existe, usar un beep generado con Web Audio API
    this.audioNotificacion.onerror = () => {
      console.log('Usando sonido generado para notificaciones');
      this.generarSonidoBeep();
    };

    // Verificar permiso de notificaciones del navegador
    if ('Notification' in window) {
      this.permisoNotificaciones = Notification.permission;
    }
  }

  // Generar un sonido beep simple usando Web Audio API
  private generarSonidoBeep(): void {
    try {
      const audioContext = new AudioContext();
      const duracion = 0.6;
      const frecuencia = 1100;

      // Crear buffer de audio
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duracion, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      // Generar onda sinusoidal con envelope
      for (let i = 0; i < buffer.length; i++) {
        const t = i / audioContext.sampleRate;
        const envelope = Math.exp(-t * 5); // Decay exponencial
        data[i] = Math.sin(2 * Math.PI * frecuencia * t) * envelope * 0.3;
      }

      // Convertir buffer a data URL
      const offlineContext = new OfflineAudioContext(1, buffer.length, audioContext.sampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start();

      offlineContext.startRendering().then(renderedBuffer => {
        // Crear WAV file manualmente
        const wavData = this.bufferToWav(renderedBuffer);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        this.audioNotificacion.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error('Error al generar sonido beep:', error);
    }
  }

  // Convertir AudioBuffer a formato WAV
  private bufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Escribir header WAV
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(36 + length); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // "fmt " sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // size
    setUint16(1); // audio format (1 = PCM)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2); // byte rate
    setUint16(buffer.numberOfChannels * 2); // block align
    setUint16(16); // bits per sample

    // "data" sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length);

    // Escribir datos de audio
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < arrayBuffer.byteLength) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i]![offset]!));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  }

  // Reproducir sonido de notificación
  reproducirSonido(): void {
    try {
      // Reiniciar el audio si ya se estaba reproduciendo
      this.audioNotificacion.currentTime = 0;
      this.audioNotificacion.play().catch(error => {
        console.warn('No se pudo reproducir el sonido de notificación:', error);
      });
    } catch (error) {
      console.error('Error al reproducir sonido:', error);
    }
  }

  // Solicitar permiso para notificaciones del navegador
  async solicitarPermiso(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return 'denied';
    }

    if (this.permisoNotificaciones === 'default') {
      this.permisoNotificaciones = await Notification.requestPermission();
    }

    return this.permisoNotificaciones;
  }

  // Mostrar notificación del navegador
  mostrarNotificacion(titulo: string, opciones?: NotificationOptions): void {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return;
    }

    if (this.permisoNotificaciones === 'granted') {
      const notificacion = new Notification(titulo, {
        icon: 'assets/loloDuda.png', // Icono de la notificación
        badge: 'assets/loloDuda.png',
        ...opciones
      });

      // Cerrar notificación después de 5 segundos
      setTimeout(() => notificacion.close(), 5000);

      // Puedes agregar eventos a la notificación
      notificacion.onclick = () => {
        window.focus();
        notificacion.close();
      };
    } else if (this.permisoNotificaciones === 'default') {
      // Si no se ha solicitado permiso, solicitarlo
      this.solicitarPermiso().then(permission => {
        if (permission === 'granted') {
          this.mostrarNotificacion(titulo, opciones);
        }
      });
    }
  }

  // Notificación completa (sonido + notificación del navegador)
  notificarMensajeNuevo(numeroUsuario: string, mensaje: string): void {
    // Reproducir sonido
    this.reproducirSonido();

    // Mostrar notificación del navegador (solo si la ventana no está enfocada)
    if (document.hidden) {
      this.mostrarNotificacion(
        `Nuevo mensaje de ${numeroUsuario}`,
        {
          body: mensaje,
          tag: 'nuevo-mensaje', // Agrupa notificaciones del mismo tipo
          requireInteraction: false,
          silent: true // El sonido ya lo manejamos nosotros
        }
      );
    }
  }

  // Notificación para nuevo caso
  notificarNuevoCaso(numeroUsuario: string, tipo: string): void {
    // Reproducir sonido
    this.reproducirSonido();

    // Mostrar notificación del navegador
    if (document.hidden) {
      this.mostrarNotificacion(
        'Nuevo caso sin atender',
        {
          body: `${tipo} - ${numeroUsuario}`,
          tag: 'nuevo-caso',
          requireInteraction: false,
          silent: true
        }
      );
    }
  }

  // Verificar si el permiso está concedido
  get tienePermiso(): boolean {
    return this.permisoNotificaciones === 'granted';
  }
}

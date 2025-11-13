import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';
import { API_SAC } from '../app.constants';

@Injectable({
  providedIn: 'root'
})export class MensajesService {
    private apiUrl = `${API_SAC}`; 

    constructor(private http: HttpClient) {}

    getUltimoMensajeChat(casoId: string) {
        return this.http.get<any>(`${this.apiUrl}/mensajes/ultimoMensajeChat/${casoId}`);
    }

    // Obtener mensajes de un caso
    getMensajesPorCaso(casoId: string, page: number = 0, size: number = 20) {
        return this.http.get<Mensaje[]>(`${this.apiUrl}/mensajes/mensajesChat/${casoId}?page=${page}&size=${size}`);
    }

    // Enviar un mensaje
    enviarMensaje(casoId: string, texto: string) {
        const params = { mensaje: texto };
        return this.http.post<any>(`${this.apiUrl}/mensajes/enviarMensaje/${casoId}`, null, { params });
    }

    // Enviar mensaje con archivo (imagen, video, audio)
    enviarMensajeConArchivo(casoId: string, archivo: File, tipoContenido: 'image' | 'audio') {
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('tipoContenido', tipoContenido);

        return this.http.post<any>(`${this.apiUrl}/mensajes/enviarMensajeMultimedia/${casoId}`, formData);
    }

    // Obtener media completa
    obtenerMediaCompleto(mediaId: string) {
        return `${this.apiUrl}/mensajes/mensajeAPIWhatsapp/${mediaId}`;
    }
}

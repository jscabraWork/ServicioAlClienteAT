import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';

@Injectable({
  providedIn: 'root'
})export class MensajesService {
    private apiUrl = 'http://localhost:8090/api/sac'; 

    constructor(private http: HttpClient) {}

    // Obtener mensajes de un caso
    getMensajesPorCaso(casoId: string) {
        return this.http.get<any>(`${this.apiUrl}/mensajes/mensajesChat/${casoId}`);
    }

    // Enviar un mensaje
    enviarMensaje(casoId: string, adminId: string, texto: string) {
        const params = { mensaje: texto };
        return this.http.post<any>(`${this.apiUrl}/mensajes/enviarMensaje/${casoId}/${adminId}`, null, { params });
    }

    // Enviar mensaje con archivo (imagen, video, audio)
    enviarMensajeConArchivo(casoId: string, adminId: string, archivo: File, tipoContenido: 'image' | 'audio') {
        const formData = new FormData();
        formData.append('file', archivo);
        formData.append('tipoContenido', tipoContenido);

        return this.http.post<any>(`${this.apiUrl}/mensajes/enviarMensajeMultimedia/${casoId}/${adminId}`, formData);
    }

    // Obtener media completa
    obtenerMediaCompleto(mediaId: string) {
        return `${this.apiUrl}/mensajes/mensajeAPIWhatsapp/${mediaId}`;
    }
}

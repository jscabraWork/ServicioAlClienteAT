import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';
import { API_SAC } from '../app.constants';

@Injectable({
  providedIn: 'root'
})export class AdministradoresService {
    private apiUrl = `${API_SAC}`; 

    constructor(private http: HttpClient) {}

    crearAdminMongo(numeroDocumento: string, nombre: string) {
      return this.http.post<any>(`${this.apiUrl}/administradores/crearAdmin/${numeroDocumento}/${nombre}`, null);
    }

    // asignarCaso
    atenderCaso(casoId: string, adminId: string) {
        return this.http.put<any>(`${this.apiUrl}/administradores/asignarAdminCaso/${casoId}/${adminId}`, {});
    }
}
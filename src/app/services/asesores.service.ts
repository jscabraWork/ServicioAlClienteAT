import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_SAC } from '../app.constants';

@Injectable({
  providedIn: 'root'
})export class AsesoresService {
    private apiUrl = `${API_SAC}`; 

    constructor(private http: HttpClient) {}

    // asignarCaso
    atenderCaso(casoId: string) {
        return this.http.put<any>(`${this.apiUrl}/asesores/asignarAsesorAbreCaso/${casoId}`, {});
    }

    obtenerAsesorPorId(asesorId: string) {
      return this.http.get<any>(`${this.apiUrl}/asesores/obtenerAsesorPorId/${asesorId}`);
    }
}
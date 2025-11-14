import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';
import { API_SAC } from '../app.constants';

@Injectable({
  providedIn: 'root'
})
export class TiposService {
  private apiUrl = `${API_SAC}`;

  constructor(private http: HttpClient) {}

  getTipos() {
    return this.http.get<any>(`${this.apiUrl}/tipos`);
  }

  obtenerTipoPorId(tipoId: string) {
    return this.http.get<any>(`${this.apiUrl}/tipos/obtenerTipoPorId/${tipoId}`);
  }

}

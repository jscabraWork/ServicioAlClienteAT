import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';
import { API_SAC } from '../app.constants';

@Injectable({
  providedIn: 'root'
})
export class CasosService {
  private apiUrl = `${API_SAC}`; 

  private casosAsignadosSubject = new BehaviorSubject<Caso[]>([]);
  public casosAsignados$ = this.casosAsignadosSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCasosPorEstado(estado: number, page: number, size: number){
    return this.http.get<any>(`${this.apiUrl}/casos/obtenerCasosPorEstado/${estado}?page=${page}&size=${size}`);
  }

  // Cerrar un caso
  cerrarCaso(casoId: string) {
    return this.http.put<any>(`${this.apiUrl}/casos/cerrarCaso/${casoId}`, {});
  }

  // Crear nuevo caso para nueva conversacion
  crearNuevoCaso(usuarioWhatsapp: string, tipo: string) {
    return this.http.post<any>(`${this.apiUrl}/casos/crearCaso/${usuarioWhatsapp}/${tipo}`, {});
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';

@Injectable({
  providedIn: 'root'
})
export class CasosService {
  private apiUrl = 'http://localhost:8090/api/sac'; 

  private casosAsignadosSubject = new BehaviorSubject<Caso[]>([]);
  public casosAsignados$ = this.casosAsignadosSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Obtener casos sin resolver
  getCasosAbiertos(){
    return this.http.get<any>(`${this.apiUrl}/casos/obtenerCasosAbiertos`);
  }

  // Obtener casos asignados
  getCasosEnProceso(adminId: string){
    return this.http.get<any>(`${this.apiUrl}/casos/obtenerCasosEnProceso/${adminId}`);
  }

  getCasosCerrados(adminId: string) {
    return this.http.get<any>(`${this.apiUrl}/casos/obtenerCasosCerrados/${adminId}`);
  }

  // Cerrar un caso
  cerrarCaso(casoId: string, adminId: string) {
    return this.http.put<any>(`${this.apiUrl}/casos/cerrarCaso/${casoId}/${adminId}`, {});
  }

  // Crear nuevo caso para nueva conversacion
  crearNuevoCaso(usuarioWhatsapp: string, tipo: string) {
    return this.http.post<any>(`${this.apiUrl}/casos/${usuarioWhatsapp}/${tipo}`, {});
  }
}

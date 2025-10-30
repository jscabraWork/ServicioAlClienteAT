import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Caso } from '../models/caso.model';
import { Mensaje } from '../models/mensaje.model';

@Injectable({
  providedIn: 'root'
})
export class TiposService {
  private apiUrl = 'http://localhost:8090/api/sac';

  constructor(private http: HttpClient) {}

  getTipos() {
    return this.http.get<any>(`${this.apiUrl}/tipos`);
  }

}

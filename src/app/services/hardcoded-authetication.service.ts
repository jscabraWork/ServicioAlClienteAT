import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HardcodedAutheticationService {
  getAsesor(){
    return sessionStorage.getItem('asesor');
  }

  asesorLogin(){
    let usuario =sessionStorage.getItem('asesor');
    return !(usuario==null);
  }

  logout(){
    sessionStorage.removeItem('asesor');    
  }
}

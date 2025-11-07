import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HardcodedAutheticationService {
  getAdmin(){
    return sessionStorage.getItem('administrador');
  }

  getAsesor(){
    return sessionStorage.getItem('asesor');
  }

  adminLoggin(){
    let usuario =sessionStorage.getItem('administrador');
    return !(usuario==null);
  }

  logout(){
    sessionStorage.removeItem('administrador');    
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HardcodedAutheticationService {
  getAdmin(){
    return sessionStorage.getItem('administrador');
  }

  adminLoggin(){
    let usuario =sessionStorage.getItem('administrador');
    return !(usuario==null);
  }

  logout(){
    sessionStorage.removeItem('administrador');    
  }
}

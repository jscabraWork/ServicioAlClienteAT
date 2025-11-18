import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuAsesorComponent } from '../menu-asesor/menu-asesor.component';
import { CommonAgregarUsuarioComponent } from '../common-agregar/common-agregar-usuario.component';
import { AsesoresWebDataService } from '../../services/data/asesores-web-data.service';
import { Usuario } from '../../models/usuario.model';
import { ActivatedRoute, Router } from '@angular/router';
import { AsesoresService } from '../../services/asesores.service';

@Component({
  selector: 'app-crear-asesor',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuAsesorComponent],
  templateUrl: './crear-asesor.component.html',
  styleUrl: './crear-asesor.component.scss'
})
export class CrearAsesorComponent extends CommonAgregarUsuarioComponent<Usuario, AsesoresWebDataService>{
  
  constructor(
    protected override service: AsesoresWebDataService, 
    protected override router: Router, 
    protected override route: ActivatedRoute,
    private asesorService: AsesoresService){
    super(service, router, route);
  }
  
  usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
  idAsesor = this.usuarioEntidad?.numeroDocumento || '';
  protected override ruta = `casos-en-proceso/${this.idAsesor}`

  mostrarPassword!: boolean;

  override ngOnInit(): void {
    this.e = new Usuario()
    this.mostrarPassword = false
    super.ngOnInit()
  }

  togglePassword(){
    this.mostrarPassword = !this.mostrarPassword;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuAdminComponent } from '../menu-admin/menu-admin.component';
import { CommonAgregarUsuarioComponent } from '../common-agregar/common-agregar-usuario.component';
import { AsesoresWebDataService } from '../../services/data/asesores-web-data.service';
import { Usuario } from '../../models/usuario.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Md5 } from 'ts-md5';
import { AdministradoresService } from '../../services/administradores.service';

@Component({
  selector: 'app-crear-asesor',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuAdminComponent],
  templateUrl: './crear-asesor.component.html',
  styleUrl: './crear-asesor.component.scss'
})
export class CrearAsesorComponent extends CommonAgregarUsuarioComponent<Usuario, AsesoresWebDataService>{
  
  constructor(
    protected override service: AsesoresWebDataService, 
    protected override router: Router, 
    protected override route: ActivatedRoute,
    private adminService: AdministradoresService){
    super(service, router, route);
  }
  
  usuarioEntidad = JSON.parse(sessionStorage.getItem('usuarioEntidad') || '{}');
  idAdmin = this.usuarioEntidad?.numeroDocumento || '';
  protected override ruta = `casos-en-proceso/${this.idAdmin}`

  mostrarPassword!: boolean;

  override ngOnInit(): void {
    this.e = new Usuario()
    this.mostrarPassword = false
    super.ngOnInit()
  }

  togglePassword(){
    this.mostrarPassword = !this.mostrarPassword;
  }

  // Sobrescribir el método save para ejecutar lógica adicional
  override save() {
    // Ejecutar el save original del padre
    const originalId = this.id;

    if(originalId != null && originalId) {
      // Caso: Edición
      if(this.contrasenaBackUp != this.e.contrasena) {
        const md5 = new Md5();
        const contra = this.e.contrasena;
        this.e.contrasena = md5.appendStr(contra).end().toString();
      }
      this.service.editar(this.e).subscribe({
        next: response => {
          alert(response.mensaje);
          this.ejecutarDespuesDeSave(); // Tu función adicional
          this.router.navigate([this.ruta]);
        }, error: error=> {
          console.error(error);
          alert("Error, vuelva a intentar");
        }
      });
    } else {
      // Caso: Creación
      const md5 = new Md5();
      const contra = this.e.contrasena;
      this.e.contrasena = md5.appendStr(contra).end().toString();
      this.service.crear(this.e).subscribe({
        next: response => {
          alert(response.mensaje);
          if (response.mensaje != 'Los datos provisionados ya se encuentran registrados') {
            this.ejecutarDespuesDeSave(); // Tu función adicional
            this.router.navigate([this.ruta]);
          }
        }, error: error=>{
          console.error(error);
          alert("Error vuelva a intentar");
        }
      });
    }
  }

  // Tu función personalizada que se ejecuta después del save
  private ejecutarDespuesDeSave() {
    this.adminService.crearAdminMongo(this.e.numeroDocumento, this.e.nombre).subscribe({
      next: response => {
        alert("Se ha creado el administrador " + response.newAdmin.nombre);
      }, error: error => {
        alert("Error creando el usuario en mongo");
      }
    })
  }
}

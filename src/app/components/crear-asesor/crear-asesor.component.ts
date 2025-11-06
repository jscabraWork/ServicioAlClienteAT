import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuAdminComponent } from '../menu-admin/menu-admin.component';

@Component({
  selector: 'app-crear-asesor',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuAdminComponent],
  templateUrl: './crear-asesor.component.html',
  styleUrl: './crear-asesor.component.scss'
})
export class CrearAsesorComponent {
  asesor = {
    numeroDocumento: '',
    nombre: '',
    tipoDocumento: '',
    celular: '',
    usuario: '',
    contrasena: ''
  };

  showPassword = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    console.log('Datos del asesor:', this.asesor);
    // Aquí puedes agregar la lógica para enviar los datos al backend
  }
}

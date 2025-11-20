import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuAsesorComponent } from '../menu-asesor/menu-asesor.component';
import { CommonAgregarUsuarioComponent } from '../common-agregar/common-agregar-usuario.component';
import { AsesoresWebDataService } from '../../services/data/asesores-web-data.service';
import { Usuario } from '../../models/usuario.model';
import { ActivatedRoute, Router } from '@angular/router';

interface TipoDocumento {
  valor: string;
  etiqueta: string;
}

interface UsuarioEntidad {
  numeroDocumento?: string;
}

@Component({
  selector: 'app-crear-asesor',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuAsesorComponent],
  templateUrl: './crear-asesor.component.html',
  styleUrl: './crear-asesor.component.scss'
})
export class CrearAsesorComponent extends CommonAgregarUsuarioComponent<Usuario, AsesoresWebDataService> implements OnInit {

  mostrarPassword = false;
  protected override ruta: string;

  readonly tiposDocumento: readonly TipoDocumento[] = [
    { valor: 'Cedula', etiqueta: 'Cédula' },
    { valor: 'TarjetaIdentidad', etiqueta: 'Tarjeta de identidad' },
    { valor: 'Pasaporte', etiqueta: 'Pasaporte' }
  ] as const;

  constructor(
    protected override service: AsesoresWebDataService,
    protected override router: Router,
    protected override route: ActivatedRoute
  ) {
    super(service, router, route);
    const usuarioEntidad = this.obtenerUsuarioEntidad();
    const idAsesor = usuarioEntidad?.numeroDocumento || '';
    this.ruta = `casos-en-proceso/${idAsesor}`;
  }

  override ngOnInit(): void {
    this.e = new Usuario();
    super.ngOnInit();
  }

  private obtenerUsuarioEntidad(): UsuarioEntidad {
    try {
      const data = sessionStorage.getItem('usuarioEntidad');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error al parsear usuarioEntidad:', error);
      return {};
    }
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  override save(): void {
    if (!this.validarFormulario()) {
      return;
    }
    super.save();
  }

  private validarFormulario(): boolean {
    const camposFaltantes: string[] = [];

    if (!this.e.numeroDocumento?.trim()) camposFaltantes.push('Número de documento');
    if (!this.e.nombre?.trim()) camposFaltantes.push('Nombre');
    if (!this.e.tipo_documento) camposFaltantes.push('Tipo de documento');
    if (!this.e.celular?.trim()) camposFaltantes.push('Celular');
    if (!this.e.correo?.trim()) camposFaltantes.push('Usuario/Correo');
    if (!this.e.contrasena?.trim()) camposFaltantes.push('Contraseña');

    if (camposFaltantes.length > 0) {
      alert(`Por favor complete los siguientes campos:\n- ${camposFaltantes.join('\n- ')}`);
      return false;
    }

    // Validación de formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.e.correo)) {
      alert('Por favor ingrese un correo electrónico válido');
      return false;
    }

    return true;
  }
}

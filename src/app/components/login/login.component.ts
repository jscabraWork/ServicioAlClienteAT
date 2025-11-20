import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HardcodedAutheticationService } from '../../services/hardcoded-authetication.service';
import { AuthService } from '../../services/seguridad/auth.service';
import { Usuario } from '../../services/usuario.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {

  mostrarPassword = false;
  usuario!: Usuario;
  errorMessage = 'Credenciales inválidas';
  invalidLogin = false;

  constructor(
    public autenticacion: HardcodedAutheticationService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = new Usuario();
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  handleLogin(): void {
    // Validar campos vacíos
    if (!this.validarCampos()) {
      return;
    }

    // Cerrar sesión anterior si existe
    this.auth.logout();

    // Limpiar espacios en blanco del usuario
    this.usuario.usuario = this.usuario.usuario.trim();

    // Intentar login
    this.auth.login(this.usuario).subscribe({
      next: response => {
        this.auth.guardarUsuario(response.access_token);
        this.auth.guardarToken(response.access_token);
        this.invalidLogin = false;
      },
      error: error => {
        this.manejarErrorLogin(error);
      }
    });
  }

  private validarCampos(): boolean {
    if (!this.usuario.usuario?.trim() || !this.usuario.contrasena?.trim()) {
      this.errorMessage = 'Usuario y contraseña son requeridos';
      this.invalidLogin = true;
      alert('Usuario o Contraseña vacíos');
      return false;
    }
    return true;
  }

  private manejarErrorLogin(error: any): void {
    if (error.status === 400) {
      this.errorMessage = 'Usuario o clave incorrectos';
      alert('Usuario o clave incorrectos');
    } else if (error.status === 0) {
      this.errorMessage = 'Error de conexión con el servidor';
      alert('Error de conexión. Por favor, verifica tu conexión a internet.');
    } else {
      this.errorMessage = 'Error al intentar iniciar sesión';
      alert('Error al intentar iniciar sesión. Intenta nuevamente.');
    }

    this.usuario = new Usuario();
    this.invalidLogin = true;
  }
}

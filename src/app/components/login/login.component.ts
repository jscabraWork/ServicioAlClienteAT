import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdministradoresService } from '../../services/administradores.service';
import { Administrador } from '../../models/administrador.model';
import { HardcodedAutheticationService } from '../../services/hardcoded-authetication.service';
import { MatDialog } from '@angular/material/dialog';
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

  mostrarPassword: boolean = false;
  usuario!: Usuario;
  errorMessage='Invalid credentials'
  invalidLogin = false;

  constructor(
    private router: Router,
    public autenticacion: HardcodedAutheticationService,
    public dialog: MatDialog,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.usuario = new Usuario();
    this.mostrarPassword = false;
  }

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  handleLogin() {
    if(this.usuario.usuario == null || this.usuario.contrasena == null) {
      alert('Usuario o Contraseña vacíos');
      return;
    }

    this.auth.logout();

    this.usuario.usuario = this.usuario.usuario.trim();

    this.auth.login(this.usuario).subscribe({
      next: response => {
        this.auth.guardarUsuario(response.access_token);
        this.auth.guardarToken(response.access_token);
      },
      error: error => {
        if(error.status == 400) {
          alert('Usuario o clave incorrectos');
        }
        this.usuario = new Usuario();
        this.invalidLogin = true;
      }
    })
  }
}

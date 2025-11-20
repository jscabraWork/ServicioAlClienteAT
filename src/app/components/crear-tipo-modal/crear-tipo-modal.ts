import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-crear-tipo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-tipo-modal.html',
  styleUrls: ['./crear-tipo-modal.scss']
})
export class CrearTipoModalComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() crearTipo = new EventEmitter<string>();

  nombreTipo: string = '';
  creandoTipo: boolean = false;

  cerrarModal(): void {
    this.cerrar.emit();
  }

  confirmarCreacion(): void {
    if (!this.nombreTipo.trim()) {
      alert('Por favor ingresa un nombre para el tipo');
      return;
    }

    this.crearTipo.emit(this.nombreTipo.trim());
  }
}

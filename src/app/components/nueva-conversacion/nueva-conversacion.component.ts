import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiposService } from '../../services/tipos.service';
import { CasosService } from '../../services/casos.service';
import intlTelInput from 'intl-tel-input';

@Component({
  selector: 'app-nueva-conversacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-conversacion.component.html',
  styleUrls: ['./nueva-conversacion.component.scss']
})
export class NuevaConversacionComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  @Output() casoCreado = new EventEmitter<any>();

  @ViewChild('phoneInput', { static: false }) phoneInput!: ElementRef;

  numeroUsuario: string = '';
  tipoSeleccionado: any = null;
  tiposCaso: any[] = [];
  iti: any;

  constructor(
    private tiposService: TiposService,
    private casosService: CasosService
  ) {}

  ngOnInit(): void {
    this.cargarTipos();
  }

  ngAfterViewInit(): void {
    // Espera a que Angular renderice el input antes de inicializar el plugin
    setTimeout(() => {
      this.inicializarIntlTel();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.iti) {
      this.iti.destroy();
      this.iti = null;
    }
  }

  inicializarIntlTel(): void {
    if (this.phoneInput && !this.iti) {
      this.iti = intlTelInput(this.phoneInput.nativeElement, {
        initialCountry: 'co',
        separateDialCode: true,
        utilsScript: 'node_modules/intl-tel-input/build/js/utils.js'
      } as any);
    }
  }

  cargarTipos(): void {
    this.tiposService.getTipos().subscribe({
      next: response => {
        this.tiposCaso = response.listaTipos || [];
      },
      error: error => {
        console.error('Error al cargar los tipos de caso:', error);
      }
    });
  }

  onInputChange(): void {
    // Actualiza el ngModel con el número completo en formato internacional
    if (this.iti) {
      this.numeroUsuario = this.iti.getNumber();
    }
  }

  cerrarModal(): void {
    this.numeroUsuario = '';
    this.tipoSeleccionado = null;
    if (this.iti) {
      this.iti.destroy();
      this.iti = null;
    }
    this.cerrar.emit();
  }

  empezarChat(): void {
    if (!this.numeroUsuario.trim() || !this.tipoSeleccionado) {
      alert('Por favor complete todos los campos');
      return;
    }

    const numeroWpp = this.iti.getSelectedCountryData().dialCode + this.numeroUsuario;

    this.casosService.crearNuevoCaso(numeroWpp, this.tipoSeleccionado.nombre).subscribe({
      next: response => {
        console.log(response.mensaje);
        console.log('Caso creado:', response.caso);
        this.casoCreado.emit(response.caso);
        this.cerrarModal();
      },
      error: error => {
        console.error('Error al crear el caso:', error);
        alert('Error al crear el caso');
      }
    });

    console.log('Crear caso con:', numeroWpp, this.tipoSeleccionado);
  }
}

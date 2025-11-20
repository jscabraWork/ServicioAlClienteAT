import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiposService } from '../../services/tipos.service';
import { CasosService } from '../../services/casos.service';
import intlTelInput, { Iti } from 'intl-tel-input';
import { Tipo } from '../../models/tipo.model';
import { Caso } from '../../models/caso.model';

@Component({
  selector: 'app-nueva-conversacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-conversacion.component.html',
  styleUrl: './nueva-conversacion.component.scss'
})
export class NuevaConversacionComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() cerrar = new EventEmitter<void>();
  @Output() casoCreado = new EventEmitter<Caso>();

  @ViewChild('phoneInput', { static: false }) phoneInput!: ElementRef<HTMLInputElement>;

  numeroUsuario = '';
  tipoSeleccionado: Tipo | null = null;
  tiposCaso: Tipo[] = [];
  errorMensaje = signal<string>('');

  private iti: Iti | null = null;

  constructor(
    private readonly tiposService: TiposService,
    private readonly casosService: CasosService
  ) {}

  ngOnInit(): void {
    this.cargarTipos();
  }

  ngAfterViewInit(): void {
    this.inicializarIntlTel();
  }

  ngOnDestroy(): void {
    this.destruirIntlTel();
  }

  private inicializarIntlTel(): void {
    if (this.phoneInput?.nativeElement && !this.iti) {
      this.iti = intlTelInput(this.phoneInput.nativeElement, {
        initialCountry: 'co',
        separateDialCode: true,
        utilsScript: 'node_modules/intl-tel-input/build/js/utils.js'
      } as any);
    }
  }

  private destruirIntlTel(): void {
    if (this.iti) {
      this.iti.destroy();
      this.iti = null;
    }
  }

  private cargarTipos(): void {
    this.tiposService.getTipos().subscribe({
      next: (response) => {
        this.tiposCaso = response.listaTipos || [];
      },
      error: (error) => {
        this.errorMensaje.set('Error al cargar los tipos de caso');
        console.error('Error al cargar los tipos de caso:', error);
      }
    });
  }

  cerrarModal(): void {
    this.limpiarFormulario();
    this.cerrar.emit();
  }

  private limpiarFormulario(): void {
    this.numeroUsuario = '';
    this.tipoSeleccionado = null;
    this.errorMensaje.set('');
  }

  empezarChat(): void {
    if (!this.validarFormulario()) {
      return;
    }

    if (!this.iti) {
      this.errorMensaje.set('Error al inicializar el selector de teléfono');
      return;
    }

    const numeroWpp = this.iti.getSelectedCountryData().dialCode + this.numeroUsuario;

    this.casosService.crearNuevoCaso(numeroWpp, this.tipoSeleccionado!.id).subscribe({
      next: (response) => {
        this.casoCreado.emit(response.caso);
        this.cerrarModal();
      },
      error: (error) => {
        this.errorMensaje.set('Error al crear el caso. Intente nuevamente.');
        console.error('Error al crear el caso:', error);
      }
    });
  }

  private validarFormulario(): boolean {
    if (!this.numeroUsuario.trim()) {
      this.errorMensaje.set('Por favor ingrese el número de usuario');
      return false;
    }

    if (!this.tipoSeleccionado) {
      this.errorMensaje.set('Por favor seleccione un tipo de caso');
      return false;
    }

    this.errorMensaje.set('');
    return true;
  }
}

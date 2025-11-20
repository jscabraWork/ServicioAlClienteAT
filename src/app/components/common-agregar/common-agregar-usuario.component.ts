import { Directive, OnDestroy, OnInit } from "@angular/core";
import { GenericUsuario } from "../../services/commons/generic-usuario.model";
import { CommonDataServiceUsuario } from "../../services/commons/common-data-usuario.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Md5 } from "ts-md5";
import { Subscription } from "rxjs";

@Directive()
export abstract class CommonAgregarUsuarioComponent<E extends GenericUsuario, S extends CommonDataServiceUsuario<E>> implements OnInit, OnDestroy {

    protected e!: E;
    protected id: string | null = null;
    protected ruta!: string;
    protected contrasenaBackUp!: string;
    private paramSubscription?: Subscription;

    constructor(protected service: S, protected router: Router, protected route: ActivatedRoute) { }

    ngOnInit(): void {
        this.paramSubscription = this.route.paramMap.subscribe(params => {
            this.id = params.get('id');
            if (this.id) {
                this.cargarUsuario(this.id);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.paramSubscription) {
            this.paramSubscription.unsubscribe();
        }
    }

    private cargarUsuario(id: string): void {
        this.service.getPorId(id).subscribe({
            next: response => {
                this.e = response.usuario;
                this.contrasenaBackUp = this.e.contrasena;
                console.log(response);
            },
            error: error => {
                console.error('Error al cargar usuario:', error);
                alert('Error, no se puede obtener la información del usuario');
            }
        });
    }

    private hashearContrasena(contrasena: string): string {
        const md5 = new Md5();
        return md5.appendStr(contrasena).end()?.toString() || '';
    }

    save(): void {
        if (this.id) {
            this.actualizarUsuario();
        } else {
            this.crearUsuario();
        }
    }

    private actualizarUsuario(): void {
        // Solo hashear si la contraseña cambió
        if (this.contrasenaBackUp !== this.e.contrasena) {
            this.e.contrasena = this.hashearContrasena(this.e.contrasena);
        }

        this.service.editar(this.e).subscribe({
            next: response => {
                alert(response.mensaje);
                this.router.navigate([this.ruta]);
            },
            error: error => {
                console.error('Error al actualizar usuario:', error);
                alert('Error, vuelva a intentar');
            }
        });
    }

    private crearUsuario(): void {
        this.e.contrasena = this.hashearContrasena(this.e.contrasena);

        this.service.crear(this.e).subscribe({
            next: response => {
                alert(response.mensaje);
                if (response.mensaje !== 'Los datos provisionados ya se encuentran registrados') {
                    this.router.navigate([this.ruta]);
                }
            },
            error: error => {
                console.error('Error al crear usuario:', error);
                alert('Error vuelva a intentar');
            }
        });
    }
}
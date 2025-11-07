import { Directive, OnInit } from "@angular/core";
import { GenericUsuario } from "../../services/commons/generic-usuario.model";
import { CommonDataServiceUsuario } from "../../services/commons/common-data-usuario.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Md5 } from "ts-md5";

@Directive()
export abstract class CommonAgregarUsuarioComponent<E extends GenericUsuario, S extends CommonDataServiceUsuario<E>> implements OnInit{
    
    protected e!:E;
    protected id: any;
    protected ruta!:string;
    contrasenaBackUp!:string
    constructor(protected service: S, protected router: Router, protected route:ActivatedRoute) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.id = params.get('id')
            if(this.id){
                this.service.getPorId(this.id).subscribe({
                    next: response => {
                        this.e = response.usuario
                        this.contrasenaBackUp = this.e.contrasena
                        console.log(response)
                    }, error:error => {
                        alert("Error, no se puede obtener la informacion" + error)
                    }
                })
            }
        })
    }

    save() {
        if(this.id != null && this.id) {
            if(this.contrasenaBackUp != this.e.contrasena) {
                var md5 = new Md5();
                var contra = this.e.contrasena;
                this.e.contrasena = md5.appendStr(contra).end().toString();
            }
            this.service.editar(this.e).subscribe({
                next: response => {
                    alert(response.mensaje);
                    this.router.navigate([this.ruta])
                }, error: error=> {
                    error
                    alert("Error, vuelva a intentar")
                }
            })
        }
        else {
            var md5 = new Md5()

            var contra = this.e.contrasena;
            this.e.contrasena = md5.appendStr(contra).end().toString();
            this.service.crear(this.e).subscribe({
                next: response => {
                    alert(response.mensaje)
                    if (response.mensaje != 'Los datos provisionados ya se encuentran registrados') {
                        this.router.navigate([this.ruta])
                    }
                }, error: error=>{
                    error
                    alert("Error vuelva a intentar")
                }
            })
        }
    }
}
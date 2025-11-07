import { GenericUsuario } from "../services/commons/generic-usuario.model";

export class Usuario implements GenericUsuario{
    nombre!: string;
    numeroDocumento!: string;
    tipo_documento!: string;
    correo!:string;
    contrasena!: string;
    celular!:string;
    enabled!:boolean;
    simplificado!:boolean
}
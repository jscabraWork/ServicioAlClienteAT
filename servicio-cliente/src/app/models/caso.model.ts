import { Administrador } from "./administrador.model";
import { Mensaje } from "./mensaje.model";
import { Tipo } from "./tipo.model";

export interface Caso {
  id: string;
  fecha: Date;
  fechaResolucion: Date;
  numeroCaso: string;
  estado: number;
  numeroUsuario: string;
  tipo: Tipo;
  administrador: Administrador;
  mensajes: Mensaje[];
}

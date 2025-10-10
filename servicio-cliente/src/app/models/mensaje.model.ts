export interface Mensaje {
  id: string;
  fecha: Date;
  mensaje: string;
  esRespuesta: boolean;
  casoId: string;
  tipoContenido: string;
  mediaId: string;
}

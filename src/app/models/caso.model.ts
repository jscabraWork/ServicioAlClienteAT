export interface Caso {
  id: string;
  fecha: Date;
  fechaResolucion: Date;
  numeroCaso: string;
  estado: number;
  numeroUsuario: string;
  tipoId: string;
  asesorAbreId: string;
  asesorCierraId: string;
  mensajesNoLeidos: number; // Contador de mensajes no leídos
  ultimaVezVisto: Date; // Timestamp de cuando el asesor vio el chat por última vez
}

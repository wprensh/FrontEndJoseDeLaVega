export type TipoPqrs = 'Peticion' | 'Queja' | 'Reclamo' | 'Sugerencia';

export const TIPOS_PQRS: readonly { valor: TipoPqrs; etiqueta: string }[] = [
  { valor: 'Peticion', etiqueta: 'Petición' },
  { valor: 'Queja', etiqueta: 'Queja' },
  { valor: 'Reclamo', etiqueta: 'Reclamo' },
  { valor: 'Sugerencia', etiqueta: 'Sugerencia' },
];

/** Cuerpo de POST /api/pqrs. */
export interface RadicarPqrs {
  nombreCompleto: string;
  correo: string;
  mensaje: string;
  tipo: TipoPqrs;
}

export interface PqrsRadicada {
  readonly id: string;
  readonly radicado: string;
  readonly radicadaEn: string;
}

/** Categorías de noticia (el backend serializa los enums como texto). */
export type CategoriaNoticia = 'Institucional' | 'Academica' | 'Cultural' | 'Deportiva' | 'Evento';

export const CATEGORIAS_NOTICIA: readonly { valor: CategoriaNoticia; etiqueta: string }[] = [
  { valor: 'Institucional', etiqueta: 'Institucional' },
  { valor: 'Academica', etiqueta: 'Académica' },
  { valor: 'Cultural', etiqueta: 'Cultural' },
  { valor: 'Deportiva', etiqueta: 'Deportiva' },
  { valor: 'Evento', etiqueta: 'Evento' },
];

export interface Noticia {
  readonly id: string;
  readonly titulo: string;
  readonly resumen: string;
  readonly contenido: string;
  readonly categoria: CategoriaNoticia;
  readonly imagenUrl: string | null;
  /** Fecha ISO sin hora: "2026-09-21". */
  readonly fechaPublicacion: string;
  readonly publicada: boolean;
  readonly creadoEn: string;
  readonly modificadoEn: string | null;
}

/** Cuerpo de POST /api/noticias y PUT /api/noticias/{id}. */
export interface GuardarNoticia {
  titulo: string;
  resumen: string;
  contenido: string | null;
  categoria: CategoriaNoticia;
  fechaPublicacion: string;
  imagenUrl: string | null;
  publicada: boolean;
}

export interface NoticiaFiltro {
  buscar?: string;
  categoria?: CategoriaNoticia;
  soloPublicadas?: boolean;
  pagina?: number;
  tamanoPagina?: number;
}

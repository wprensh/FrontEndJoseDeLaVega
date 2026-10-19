/** Categorías de noticia (el backend serializa los enums como texto). */
export type CategoriaNoticia = 'Institucional' | 'Academica' | 'Cultural' | 'Deportiva' | 'Evento';

/** Apariencia de cada categoría (etiqueta, icono y colores) usada en tarjetas y modales. */
export interface EstiloCategoria {
  readonly etiqueta: string;
  readonly icono: string;
  /** Color principal: franja, icono y texto del chip. */
  readonly color: string;
  /** Color de fondo suave del chip. */
  readonly fondo: string;
}

export const ESTILOS_CATEGORIA: Readonly<Record<CategoriaNoticia, EstiloCategoria>> = {
  Institucional: { etiqueta: 'Institucional', icono: 'account_balance', color: '#0a2647', fondo: '#e7edf7' },
  Academica: { etiqueta: 'Académica', icono: 'school', color: '#1d4f91', fondo: '#dde7fb' },
  Cultural: { etiqueta: 'Cultural', icono: 'theater_comedy', color: '#9b1c2c', fondo: '#fde2e4' },
  Deportiva: { etiqueta: 'Deportiva', icono: 'sports_soccer', color: '#1e6b37', fondo: '#e3f4e8' },
  Evento: { etiqueta: 'Evento', icono: 'event', color: '#7a5200', fondo: '#fff3c4' },
};

/** Estilo usado si la API devuelve una categoría que el frontend aún no conoce. */
export const ESTILO_CATEGORIA_POR_DEFECTO: EstiloCategoria = {
  etiqueta: 'Noticia',
  icono: 'article',
  color: '#0a2647',
  fondo: '#e7edf7',
};

export function estiloDeCategoria(categoria: string): EstiloCategoria {
  return ESTILOS_CATEGORIA[categoria as CategoriaNoticia] ?? { ...ESTILO_CATEGORIA_POR_DEFECTO, etiqueta: categoria };
}

export const CATEGORIAS_NOTICIA: readonly { valor: CategoriaNoticia; etiqueta: string }[] = (
  Object.keys(ESTILOS_CATEGORIA) as CategoriaNoticia[]
).map((valor) => ({ valor, etiqueta: ESTILOS_CATEGORIA[valor].etiqueta }));

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

/** Orden del listado por fecha de publicación (enum OrdenNoticias del backend). */
export type OrdenNoticias = 'Recientes' | 'Antiguas';

export interface NoticiaFiltro {
  buscar?: string;
  categoria?: CategoriaNoticia;
  soloPublicadas?: boolean;
  /** Fecha ISO "yyyy-MM-dd", inclusiva. */
  desde?: string;
  /** Fecha ISO "yyyy-MM-dd", inclusiva. */
  hasta?: string;
  orden?: OrdenNoticias;
  pagina?: number;
  tamanoPagina?: number;
}

/** Cantidad de noticias de un mes (GET /api/noticias/archivo). */
export interface ArchivoMes {
  readonly anio: number;
  /** 1 = enero … 12 = diciembre. */
  readonly mes: number;
  readonly total: number;
}

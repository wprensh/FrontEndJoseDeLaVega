/**
 * Datos institucionales que aparecen en varias plantillas.
 * Centralizarlos aquí evita repetirlos y facilita actualizarlos.
 */
export const INSTITUCION = {
  nombre: 'Institución Educativa José de la Vega',
  nombreCorto: 'I.E. José de la Vega',
  ciudad: 'Cartagena de Indias',
  lema: 'Honor y Trabajo',
  direccion: 'Calle Ppal #53-52, Torices / Santa Rita, Cartagena',
  telefonos: '(605) 658 1347 / 666 5113',
  correo: 'iejosedelavega@hotmail.com',
  horarioAtencion: '7:00 a.m. - 3:00 p.m.',
  redes: {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
  },
} as const;

export interface EnlaceNavegacion {
  readonly ruta: string;
  readonly etiqueta: string;
}

export const NAVEGACION: readonly EnlaceNavegacion[] = [
  { ruta: '/inicio', etiqueta: 'Inicio' },
  { ruta: '/nosotros', etiqueta: 'Nosotros' },
  { ruta: '/academico', etiqueta: 'Académico' },
  { ruta: '/admisiones', etiqueta: 'Admisiones' },
  { ruta: '/servicios', etiqueta: 'Servicios' },
  { ruta: '/contacto', etiqueta: 'Contacto' },
  { ruta: '/campus', etiqueta: 'Campus Virtual' },
];

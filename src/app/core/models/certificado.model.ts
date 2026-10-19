/** Tipos de certificado (el backend serializa los enums como texto). */
export type TipoCertificado =
  | 'Estudios'
  | 'Matricula'
  | 'Conducta'
  | 'PazYSalvo'
  | 'Asistencia'
  | 'Reconocimiento'
  | 'Laboral'
  | 'Personalizado';

export type TipoDocumento =
  | 'RegistroCivil'
  | 'TarjetaIdentidad'
  | 'CedulaCiudadania'
  | 'CedulaExtranjeria'
  | 'PermisoProteccionTemporal'
  | 'Pasaporte'
  | 'Nuip';

export const TIPOS_DOCUMENTO: readonly { valor: TipoDocumento; etiqueta: string; sigla: string }[] = [
  { valor: 'TarjetaIdentidad', etiqueta: 'Tarjeta de identidad', sigla: 'T.I.' },
  { valor: 'RegistroCivil', etiqueta: 'Registro civil', sigla: 'R.C.' },
  { valor: 'Nuip', etiqueta: 'NUIP', sigla: 'NUIP' },
  { valor: 'CedulaCiudadania', etiqueta: 'Cédula de ciudadanía', sigla: 'C.C.' },
  { valor: 'CedulaExtranjeria', etiqueta: 'Cédula de extranjería', sigla: 'C.E.' },
  { valor: 'PermisoProteccionTemporal', etiqueta: 'Permiso por Protección Temporal', sigla: 'PPT' },
  { valor: 'Pasaporte', etiqueta: 'Pasaporte', sigla: 'Pasaporte' },
];

export const GRADOS: readonly string[] = [
  'Transición',
  'Primero (1°)',
  'Segundo (2°)',
  'Tercero (3°)',
  'Cuarto (4°)',
  'Quinto (5°)',
  'Sexto (6°)',
  'Séptimo (7°)',
  'Octavo (8°)',
  'Noveno (9°)',
  'Décimo (10°)',
  'Undécimo (11°)',
];

/** Datos con los que se redacta el texto sugerido de cada tipo de certificado. */
export interface DatosRedaccion {
  readonly nombre: string;
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  readonly grado: string;
  readonly anioLectivo: number | null;
}

/** Configuración de cada tipo: título del documento, verbo de la fórmula y texto sugerido. */
export interface PlantillaCertificado {
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly icono: string;
  readonly titulo: string;
  /** "CERTIFICA", "HACE CONSTAR" u "OTORGA". */
  readonly verbo: string;
  /** Si el documento suele llevar grado y año lectivo. */
  readonly esEstudiantil: boolean;
  readonly redactar: (datos: DatosRedaccion) => string;
}

/**
 * Los textos entre corchetes son datos que el administrador debe completar a mano;
 * el panel no deja expedir el certificado mientras queden corchetes en el texto.
 */
export const PLANTILLAS_CERTIFICADO: Readonly<Record<TipoCertificado, PlantillaCertificado>> = {
  Estudios: {
    etiqueta: 'Certificado de estudios',
    descripcion: 'Grado cursado y aprobado en un año lectivo.',
    icono: 'school',
    titulo: 'CERTIFICADO DE ESTUDIOS',
    verbo: 'CERTIFICA',
    esEstudiantil: true,
    redactar: (d) =>
      `Que ${identificacion(d)}, cursó y aprobó en esta institución el grado ${grado(d)} durante el año lectivo ` +
      `${anio(d)}, de acuerdo con el plan de estudios vigente y el Proyecto Educativo Institucional (PEI).\n\n` +
      'Se expide a solicitud de la parte interesada.',
  },
  Matricula: {
    etiqueta: 'Constancia de matrícula',
    descripcion: 'Estudiante matriculado y activo en el año en curso.',
    icono: 'how_to_reg',
    titulo: 'CONSTANCIA DE MATRÍCULA',
    verbo: 'HACE CONSTAR',
    esEstudiantil: true,
    redactar: (d) =>
      `Que ${identificacion(d)}, se encuentra matriculado(a) en esta institución en el grado ${grado(d)} para el ` +
      `año lectivo ${anio(d)} y asiste regularmente a clases.\n\n` +
      'Se expide a solicitud de la parte interesada.',
  },
  Conducta: {
    etiqueta: 'Certificado de conducta',
    descripcion: 'Comportamiento según el Manual de Convivencia.',
    icono: 'verified_user',
    titulo: 'CERTIFICADO DE CONDUCTA',
    verbo: 'CERTIFICA',
    esEstudiantil: true,
    redactar: (d) =>
      `Que ${identificacion(d)}, estudiante del grado ${grado(d)} durante el año lectivo ${anio(d)}, observó un ` +
      'comportamiento acorde con el Manual de Convivencia de la institución, demostrando respeto, responsabilidad ' +
      'y sentido de pertenencia.\n\n' +
      'Se expide a solicitud de la parte interesada.',
  },
  PazYSalvo: {
    etiqueta: 'Paz y salvo',
    descripcion: 'Sin pendientes con la institución.',
    icono: 'task_alt',
    titulo: 'PAZ Y SALVO',
    verbo: 'CERTIFICA',
    esEstudiantil: true,
    redactar: (d) =>
      `Que ${identificacion(d)}, estudiante del grado ${grado(d)}, se encuentra a paz y salvo por todo concepto ` +
      'con esta institución (biblioteca, laboratorios, material didáctico y demás dependencias) a la fecha de ' +
      'expedición del presente documento.',
  },
  Asistencia: {
    etiqueta: 'Constancia de asistencia',
    descripcion: 'Participación en un evento, curso o actividad.',
    icono: 'event_available',
    titulo: 'CONSTANCIA DE ASISTENCIA',
    verbo: 'HACE CONSTAR',
    esEstudiantil: false,
    redactar: (d) =>
      `Que ${identificacion(d)}, asistió y participó en [nombre de la actividad], realizada por esta institución ` +
      'el [fecha de la actividad], con una intensidad de [número] horas.',
  },
  Reconocimiento: {
    etiqueta: 'Reconocimiento / Mención de honor',
    descripcion: 'Exaltación por desempeño, disciplina o logros.',
    icono: 'military_tech',
    titulo: 'MENCIÓN DE HONOR',
    verbo: 'OTORGA LA PRESENTE MENCIÓN A',
    esEstudiantil: true,
    redactar: (d) =>
      `${nombre(d)}, estudiante del grado ${grado(d)}, como reconocimiento a su excelente desempeño académico, ` +
      `disciplina y espíritu de superación durante el año lectivo ${anio(d)}, exaltando los valores de nuestro ` +
      'lema institucional “Honor y Trabajo”.',
  },
  Laboral: {
    etiqueta: 'Certificación laboral',
    descripcion: 'Para docentes y personal administrativo.',
    icono: 'badge',
    titulo: 'CERTIFICACIÓN LABORAL',
    verbo: 'CERTIFICA',
    esEstudiantil: false,
    redactar: (d) =>
      `Que ${identificacion(d)}, labora en esta institución desde el [fecha de ingreso], desempeñando el cargo de ` +
      '[cargo], con vinculación [tipo de vinculación].\n\n' +
      'Se expide a solicitud de la parte interesada.',
  },
  Personalizado: {
    etiqueta: 'Otro certificado (texto libre)',
    descripcion: 'Escriba el título y el texto que necesite.',
    icono: 'edit_note',
    titulo: 'CERTIFICADO',
    verbo: 'CERTIFICA',
    esEstudiantil: false,
    redactar: (d) => `Que ${identificacion(d)}, [escriba aquí lo que certifica la institución].`,
  },
};

export const TIPOS_CERTIFICADO: readonly { valor: TipoCertificado; plantilla: PlantillaCertificado }[] = (
  Object.keys(PLANTILLAS_CERTIFICADO) as TipoCertificado[]
).map((valor) => ({ valor, plantilla: PLANTILLAS_CERTIFICADO[valor] }));

export function plantillaDe(tipo: string): PlantillaCertificado {
  return PLANTILLAS_CERTIFICADO[tipo as TipoCertificado] ?? PLANTILLAS_CERTIFICADO.Personalizado;
}

export function siglaDocumento(tipo: string): string {
  return TIPOS_DOCUMENTO.find((t) => t.valor === tipo)?.sigla ?? tipo;
}

/** Hay datos sin completar si el texto aún tiene marcadores "[...]". */
export function tieneMarcadores(texto: string): boolean {
  return /\[[^\]]*\]/.test(texto);
}

const nombre = (d: DatosRedaccion): string => d.nombre.trim().toUpperCase() || '[NOMBRE COMPLETO]';
const grado = (d: DatosRedaccion): string => d.grado.trim() || '[grado]';
const anio = (d: DatosRedaccion): string => (d.anioLectivo ? String(d.anioLectivo) : '[año lectivo]');
const identificacion = (d: DatosRedaccion): string =>
  `${nombre(d)}, identificado(a) con ${siglaDocumento(d.tipoDocumento)} No. ${d.numeroDocumento.trim() || '[número]'}`;

/** Certificado tal como lo devuelve la API. */
export interface Certificado {
  readonly id: string;
  readonly codigo: string;
  readonly tipo: TipoCertificado;
  readonly titulo: string;
  readonly nombreBeneficiario: string;
  readonly tipoDocumento: TipoDocumento;
  readonly numeroDocumento: string;
  readonly grado: string | null;
  readonly anioLectivo: number | null;
  readonly contenido: string;
  /** Fecha ISO sin hora: "2026-10-19". */
  readonly fechaExpedicion: string;
  readonly firmanteNombre: string;
  readonly firmanteCargo: string;
  readonly anulado: boolean;
  readonly motivoAnulacion: string | null;
  readonly creadoEn: string;
}

/** Cuerpo de POST /api/certificados. */
export interface ExpedirCertificado {
  tipo: TipoCertificado;
  titulo: string;
  nombreBeneficiario: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  grado: string | null;
  anioLectivo: number | null;
  contenido: string;
  fechaExpedicion: string;
  firmanteNombre: string;
  firmanteCargo: string;
}

/** Respuesta pública de GET /api/certificados/verificar/{codigo}. */
export interface VerificacionCertificado {
  readonly codigo: string;
  readonly tipo: TipoCertificado;
  readonly titulo: string;
  readonly nombreBeneficiario: string;
  readonly documentoParcial: string;
  readonly fechaExpedicion: string;
  readonly anulado: boolean;
}

export interface CertificadoFiltro {
  buscar?: string;
  tipo?: TipoCertificado;
  pagina?: number;
  tamanoPagina?: number;
}

/**
 * Lo que necesita la hoja con membrete para dibujarse: un certificado expedido
 * o la vista previa del formulario (sin código todavía).
 */
export type DocumentoCertificado = Omit<Certificado, 'id' | 'codigo' | 'motivoAnulacion' | 'creadoEn'> & {
  readonly codigo: string | null;
};

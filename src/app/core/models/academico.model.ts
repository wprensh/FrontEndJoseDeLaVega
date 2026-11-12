/**
 * Plataforma académica: notas y boletines, asistencia, observador del estudiante y avisos.
 * Mismos nombres que los contratos de la API (camelCase).
 */

// ---------- Escala valorativa (Decreto 1290) ----------

export type Desempeno = 'Bajo' | 'Basico' | 'Alto' | 'Superior';

export const DESEMPENOS: Readonly<Record<Desempeno, string>> = {
  Bajo: 'Bajo',
  Basico: 'Básico',
  Alto: 'Alto',
  Superior: 'Superior',
};

/** Escala institucional de 1,0 a 5,0. */
export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const NOTA_APROBATORIA = 3;

export function desempenoDe(nota: number | null | undefined): Desempeno | null {
  if (nota === null || nota === undefined) {
    return null;
  }
  return nota >= 4.6 ? 'Superior' : nota >= 4 ? 'Alto' : nota >= 3 ? 'Basico' : 'Bajo';
}

/** 4.25 → "4,3": una cifra decimal con coma, como en los boletines colombianos. */
export function formatoNota(nota: number | null | undefined): string {
  return nota === null || nota === undefined ? '—' : nota.toFixed(1).replace('.', ',');
}

// ---------- Configuración académica ----------

export interface Asignatura {
  readonly id: string;
  readonly nombre: string;
  readonly area: string;
  readonly orden: number;
  readonly activa: boolean;
}

export interface GuardarAsignatura {
  nombre: string;
  area: string | null;
  orden: number;
  activa: boolean;
}

export interface Periodo {
  readonly id: string;
  readonly anio: number;
  readonly numero: number;
  readonly nombre: string;
  readonly inicio: string;
  readonly fin: string;
  readonly porcentaje: number;
  readonly notasAbiertas: boolean;
  readonly publicado: boolean;
}

export interface GuardarPeriodo {
  anio: number;
  numero: number;
  nombre: string | null;
  inicio: string;
  fin: string;
  porcentaje: number;
  notasAbiertas: boolean;
  publicado: boolean;
}

export interface Asignacion {
  readonly id: string;
  readonly anio: number;
  readonly docenteId: string;
  readonly docenteNombre: string;
  readonly asignaturaId: string;
  readonly asignatura: string;
  readonly area: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly intensidadHoraria: number | null;
}

export interface CrearAsignacion {
  anio: number;
  docenteId: string;
  asignaturaId: string;
  grado: number;
  grupo: string | null;
  intensidadHoraria: number | null;
}

export interface Curso {
  readonly grado: number;
  readonly grupo: string | null;
  readonly estudiantes: number;
}

export interface PersonaResumen {
  readonly id: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
}

export interface Consolidado {
  readonly periodo: Periodo;
  readonly grado: number;
  readonly grupo: string | null;
  readonly asignaturas: readonly { readonly id: string; readonly nombre: string; readonly area: string }[];
  readonly filas: readonly {
    readonly estudianteId: string;
    readonly nombreCompleto: string;
    readonly documento: string;
    readonly notas: readonly (number | null)[];
    readonly promedio: number | null;
    readonly puesto: number | null;
    readonly asignaturasPerdidas: number;
  }[];
  readonly promedioCurso: number | null;
  readonly avanceCarguePorcentaje: number;
}

// ---------- Planilla del docente ----------

export interface CursoDocente {
  readonly asignacionId: string;
  readonly asignaturaId: string;
  readonly asignatura: string;
  readonly area: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly intensidadHoraria: number | null;
  readonly estudiantes: number;
}

export interface MisCursos {
  readonly anio: number;
  readonly periodos: readonly Periodo[];
  readonly cursos: readonly CursoDocente[];
}

export interface FilaPlanillaNotas {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly nota: number | null;
  readonly fallas: number | null;
  /** Fallas tomadas en la asistencia del periodo, como sugerencia. */
  readonly fallasRegistradas: number;
  readonly observacion: string | null;
}

export interface PlanillaNotas {
  readonly asignacionId: string;
  readonly asignatura: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly periodo: Periodo;
  readonly editable: boolean;
  readonly filas: readonly FilaPlanillaNotas[];
}

export interface NotaEstudiante {
  estudianteId: string;
  nota: number | null;
  fallas: number | null;
  observacion: string | null;
}

// ---------- Boletín ----------

export interface EstudianteBoletin {
  readonly id: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
}

export interface AsignaturaBoletin {
  readonly asignaturaId: string;
  readonly nombre: string;
  readonly docente: string | null;
  readonly intensidadHoraria: number | null;
  readonly notasPeriodos: readonly (number | null)[];
  readonly nota: number | null;
  readonly desempeno: Desempeno | null;
  readonly fallas: number;
  readonly observacion: string | null;
  readonly acumulada: number | null;
}

export interface Boletin {
  readonly estudiante: EstudianteBoletin;
  readonly periodo: Periodo;
  readonly periodos: readonly { readonly id: string; readonly numero: number; readonly nombre: string; readonly porcentaje: number }[];
  readonly areas: readonly { readonly area: string; readonly asignaturas: readonly AsignaturaBoletin[] }[];
  readonly promedio: number | null;
  readonly desempenoGeneral: Desempeno | null;
  readonly puesto: number | null;
  readonly totalCurso: number;
  readonly fallasTotales: number;
  readonly asignaturasPerdidas: number;
  readonly generadoEn: string;
}

export interface BoletinesDisponibles {
  readonly estudiantes: readonly EstudianteBoletin[];
  readonly periodos: readonly Periodo[];
}

// ---------- Asistencia ----------

export type EstadoAsistencia = 'Ausente' | 'Tarde' | 'Excusa';

export const ESTADOS_ASISTENCIA: Readonly<Record<EstadoAsistencia, string>> = {
  Ausente: 'Ausente',
  Tarde: 'Llegó tarde',
  Excusa: 'Con excusa',
};

export interface FilaAsistencia {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly estado: EstadoAsistencia | null;
  readonly observacion: string | null;
}

export interface PlanillaAsistencia {
  readonly asignacionId: string;
  readonly asignatura: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly fecha: string;
  readonly tomada: boolean;
  readonly filas: readonly FilaAsistencia[];
}

export interface Novedad {
  estudianteId: string;
  estado: EstadoAsistencia;
  observacion: string | null;
}

export interface ContactoNovedad {
  readonly estudianteId: string;
  readonly estudiante: string;
  readonly estado: EstadoAsistencia;
  readonly acudientes: readonly { readonly nombre: string; readonly telefono: string | null; readonly parentesco: string | null }[];
}

export interface RegistroAsistencia {
  readonly planilla: PlanillaAsistencia;
  readonly contactos: readonly ContactoNovedad[];
  readonly avisosEnviados: number;
}

export interface ResumenAsistencia {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly anio: number;
  readonly ausencias: number;
  readonly tardes: number;
  readonly excusas: number;
  readonly novedades: readonly {
    readonly fecha: string;
    readonly asignatura: string;
    readonly estado: EstadoAsistencia;
    readonly observacion: string | null;
  }[];
}

export interface ReporteAsistencia {
  readonly grado: number;
  readonly grupo: string | null;
  readonly desde: string;
  readonly hasta: string;
  readonly clasesRegistradas: number;
  readonly filas: readonly {
    readonly estudianteId: string;
    readonly nombreCompleto: string;
    readonly documento: string;
    readonly ausencias: number;
    readonly tardes: number;
    readonly excusas: number;
  }[];
}

// ---------- Convivencia (observador del estudiante, Ley 1620) ----------

export type TipoAnotacion = 'Positiva' | 'Observacion' | 'SituacionTipoI' | 'SituacionTipoII' | 'SituacionTipoIII';
export type EstadoCaso = 'Abierto' | 'EnSeguimiento' | 'Cerrado';

export const TIPOS_ANOTACION: Readonly<Record<TipoAnotacion, string>> = {
  Positiva: 'Anotación positiva',
  Observacion: 'Observación',
  SituacionTipoI: 'Situación tipo I',
  SituacionTipoII: 'Situación tipo II',
  SituacionTipoIII: 'Situación tipo III',
};

export const AYUDA_TIPO_ANOTACION: Readonly<Record<TipoAnotacion, string>> = {
  Positiva: 'Reconocimiento por logros, valores o liderazgo.',
  Observacion: 'Llamado de atención o novedad que no es una situación de convivencia.',
  SituacionTipoI: 'Conflictos manejados inadecuadamente que no generan daños al cuerpo o a la salud.',
  SituacionTipoII: 'Agresión, acoso escolar o ciberacoso repetido, o que causa daños sin incapacidad.',
  SituacionTipoIII: 'Presunto delito: se informa a la Policía de Infancia y Adolescencia.',
};

export const ESTADOS_CASO: Readonly<Record<EstadoCaso, string>> = {
  Abierto: 'Abierto',
  EnSeguimiento: 'En seguimiento',
  Cerrado: 'Cerrado',
};

export interface Anotacion {
  readonly id: string;
  readonly estudianteId: string;
  readonly estudianteNombre: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly tipo: TipoAnotacion;
  readonly fecha: string;
  readonly descripcion: string;
  readonly compromisos: string | null;
  readonly autorNombre: string;
  /** Docente que la registró desde el campus; null si la registró coordinación. */
  readonly autorMiembroId?: string | null;
  readonly estado: EstadoCaso;
  readonly enteradoEn: string | null;
  readonly enteradoPor: string | null;
  readonly seguimientos: readonly {
    readonly id: string;
    readonly texto: string;
    readonly autorNombre: string;
    readonly creadoEn: string;
  }[];
  readonly creadoEn: string;
  /** El docente que consulta puede corregirla o eliminarla (es suya, dentro de 48 h y sin acudiente enterado). */
  readonly puedeModificar?: boolean;
}

export interface CrearAnotacion {
  estudianteId: string;
  tipo: TipoAnotacion;
  fecha: string;
  descripcion: string;
  compromisos: string | null;
}

export type EditarAnotacion = Omit<CrearAnotacion, 'estudianteId'>;

export interface Observador {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly resumen: readonly { readonly tipo: TipoAnotacion; readonly total: number }[];
  readonly anotaciones: readonly Anotacion[];
}

// ---------- Avisos del campus ----------

export type TipoAviso =
  | 'Asistencia'
  | 'Convivencia'
  | 'Calificaciones'
  | 'Circular'
  | 'Simulacro'
  | 'General'
  | 'Tarea'
  | 'Mensaje'
  | 'Planeacion'
  | 'Recuperacion';

export const ICONOS_AVISO: Readonly<Record<TipoAviso, string>> = {
  Asistencia: 'event_busy',
  Convivencia: 'diversity_3',
  Calificaciones: 'grading',
  Circular: 'campaign',
  Simulacro: 'quiz',
  General: 'notifications',
  Tarea: 'assignment',
  Mensaje: 'chat',
  Planeacion: 'edit_calendar',
  Recuperacion: 'restart_alt',
};

export interface Aviso {
  readonly id: string;
  readonly tipo: TipoAviso;
  readonly titulo: string;
  readonly mensaje: string;
  readonly enlace: string | null;
  readonly estudianteId: string | null;
  readonly leido: boolean;
  readonly creadoEn: string;
}

export interface Avisos {
  readonly noLeidos: number;
  readonly items: readonly Aviso[];
}

/** Fecha de hoy en Colombia (UTC-5) como "2026-11-07". */
export function hoyColombia(): string {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
}

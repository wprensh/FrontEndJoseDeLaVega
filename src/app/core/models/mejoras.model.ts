/**
 * Alerta temprana, aula virtual, planeador, recuperaciones y comisión de evaluación, reportes oficiales,
 * mensajería y notificaciones push. Mismos nombres que los contratos de la API (camelCase).
 */
import { Desempeno, EstudianteBoletin, Periodo } from './academico.model';
import { RolCampus } from './campus.model';

// ---------- Notificaciones push ----------

export interface ConfiguracionPush {
  readonly habilitado: boolean;
  readonly clavePublica: string | null;
  readonly dispositivos: number;
}

// ---------- Alerta temprana ----------

export type NivelRiesgo = 'Bajo' | 'Medio' | 'Alto';

export const NIVELES_RIESGO: Readonly<Record<NivelRiesgo, string>> = { Alto: 'Riesgo alto', Medio: 'Riesgo medio', Bajo: 'Riesgo bajo' };

export interface AlertaEstudiante {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly puntaje: number;
  readonly nivel: NivelRiesgo;
  readonly motivos: readonly string[];
  readonly ausencias30Dias: number;
  readonly ausenciasAnio: number;
  readonly perdidasAcumuladas: number;
  readonly promedio: number | null;
  readonly situacionesAbiertas: number;
  readonly porcentajeSimulacro: number | null;
  readonly acudiente: string | null;
  readonly telefonoAcudiente: string | null;
  readonly correoAcudiente: string | null;
}

export interface Alertas {
  readonly fecha: string;
  readonly periodo: string | null;
  readonly evaluados: number;
  readonly altos: number;
  readonly medios: number;
  readonly bajos: number;
  readonly items: readonly AlertaEstudiante[];
}

// ---------- Aula virtual ----------

export type TipoActividad = 'Material' | 'Tarea';

export interface ArchivoAula {
  readonly id: string;
  readonly nombreArchivo: string;
  readonly tipoContenido: string;
  readonly tamano: number;
}

export interface Entrega {
  readonly id: string | null;
  readonly estudianteId: string;
  readonly estudiante: string;
  readonly texto: string | null;
  readonly enlace: string | null;
  readonly archivo: ArchivoAula | null;
  readonly entregadaEn: string | null;
  readonly tarde: boolean;
  readonly nota: number | null;
  readonly comentario: string | null;
  readonly calificadaEn: string | null;
}

export interface Actividad {
  readonly id: string;
  readonly asignacionId: string;
  readonly asignatura: string;
  readonly docente: string | null;
  readonly grado: number;
  readonly grupo: string | null;
  readonly periodoId: string;
  readonly tipo: TipoActividad;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly enlace: string | null;
  readonly archivo: ArchivoAula | null;
  readonly fechaEntrega: string | null;
  readonly calificable: boolean;
  readonly creadoEn: string;
  readonly entregas: number;
  readonly calificadas: number;
  readonly estudiantes: number;
  readonly miEntrega: Entrega | null;
}

export interface GuardarActividad {
  tipo: TipoActividad;
  periodoId: string;
  titulo: string;
  descripcion: string | null;
  enlace: string | null;
  archivoId: string | null;
  fechaEntrega: string | null;
  calificable: boolean;
}

export interface EntregasActividad {
  readonly actividad: Actividad;
  readonly filas: readonly Entrega[];
}

export interface CalificarEntrega {
  estudianteId: string;
  nota: number | null;
  comentario: string | null;
}

export interface AulaEstudiante {
  readonly estudiante: EstudianteBoletin;
  readonly actividades: readonly Actividad[];
}

export interface PasoPlanilla {
  readonly actualizadas: number;
  readonly sinNotas: number;
  readonly tareas: readonly string[];
}

/** Archivos que acepta el aula (PDF, imágenes y Office), hasta 5 MB. */
export const TIPOS_ARCHIVO_AULA =
  'application/pdf,image/jpeg,image/png,.docx,.xlsx,.pptx,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
export const MAXIMO_ARCHIVO_AULA = 5 * 1024 * 1024;

export function tamanoLegible(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ---------- Planeación ----------

export type EstadoPlaneacion = 'Borrador' | 'Enviada' | 'Aprobada' | 'Devuelta';

export const ESTADOS_PLANEACION: Readonly<Record<EstadoPlaneacion, string>> = {
  Borrador: 'Borrador',
  Enviada: 'Enviada a revisión',
  Aprobada: 'Aprobada',
  Devuelta: 'Devuelta con observaciones',
};

export interface PlanEstudios {
  readonly id: string;
  readonly asignaturaId: string;
  readonly asignatura: string;
  readonly area: string;
  readonly grado: number;
  readonly periodo: number;
  readonly estandares: string | null;
  readonly dba: string | null;
  readonly competencias: string | null;
  readonly contenidos: string | null;
  readonly indicadores: string | null;
  readonly actualizadoPor: string;
  readonly actualizadoEn: string | null;
}

export interface GuardarPlanEstudios {
  asignaturaId: string;
  grado: number;
  periodo: number;
  estandares: string | null;
  dba: string | null;
  competencias: string | null;
  contenidos: string | null;
  indicadores: string | null;
}

export interface Planeacion {
  readonly id: string;
  readonly asignacionId: string;
  readonly asignatura: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly docenteId: string;
  readonly docente: string;
  readonly periodoId: string | null;
  readonly semana: string;
  readonly tema: string;
  readonly aprendizajes: string | null;
  readonly actividades: string | null;
  readonly recursos: string | null;
  readonly evaluacion: string | null;
  readonly estado: EstadoPlaneacion;
  readonly enviadaEn: string | null;
  readonly observacion: string | null;
  readonly revisadaPor: string | null;
  readonly revisadaEn: string | null;
  readonly creadoEn: string;
}

export interface GuardarPlaneacion {
  asignacionId: string;
  periodoId: string | null;
  semana: string;
  tema: string;
  aprendizajes: string | null;
  actividades: string | null;
  recursos: string | null;
  evaluacion: string | null;
  enviar: boolean;
}

// ---------- Recuperaciones y comisión de evaluación ----------

export type EstadoRecuperacion = 'Pendiente' | 'Aprobada' | 'Reprobada';

export const ESTADOS_RECUPERACION: Readonly<Record<EstadoRecuperacion, string>> = {
  Pendiente: 'Pendiente',
  Aprobada: 'Recuperó',
  Reprobada: 'No recuperó',
};

export interface Recuperacion {
  readonly id: string;
  readonly estudianteId: string;
  readonly estudiante: string;
  readonly curso: string;
  readonly asignaturaId: string;
  readonly asignatura: string;
  readonly periodoId: string;
  readonly periodo: string;
  readonly notaOriginal: number;
  readonly plan: string;
  readonly fechaLimite: string | null;
  readonly notaRecuperacion: number | null;
  readonly notaDefinitiva: number | null;
  readonly observacion: string | null;
  readonly estado: EstadoRecuperacion;
  readonly registradaPor: string;
  readonly creadoEn: string;
}

export interface FilaRecuperacionClase {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly notaPeriodo: number | null;
  readonly recuperacion: Recuperacion | null;
}

export interface RecuperacionesClase {
  readonly asignacionId: string;
  readonly asignatura: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly periodo: Periodo;
  readonly filas: readonly FilaRecuperacionClase[];
}

export type DecisionComision =
  | 'Promovido'
  | 'PlanMejoramiento'
  | 'CompromisoAcademico'
  | 'RemitirOrientacion'
  | 'PromocionAnticipada'
  | 'NoPromovido';

export const DECISIONES: Readonly<Record<DecisionComision, string>> = {
  Promovido: 'Aprobado / promovido',
  PlanMejoramiento: 'Plan de mejoramiento',
  CompromisoAcademico: 'Compromiso académico',
  RemitirOrientacion: 'Remitir a orientación',
  PromocionAnticipada: 'Promoción anticipada',
  NoPromovido: 'No promovido',
};

export interface CandidatoComision {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly perdidas: readonly { readonly asignatura: string; readonly nota: number }[];
  readonly fallas: number;
  readonly recuperacionesPendientes: number;
  readonly promedio: number | null;
  readonly sugerida: DecisionComision;
}

export interface CandidatosComision {
  readonly anio: number;
  readonly periodoId: string | null;
  readonly periodo: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly estudiantes: readonly CandidatoComision[];
}

export interface DecisionActa {
  estudianteId: string;
  nombreEstudiante?: string;
  situacion: string | null;
  decision: DecisionComision;
  observacion: string | null;
}

export interface Acta {
  readonly id: string;
  readonly codigo: string;
  readonly anio: number;
  readonly periodoId: string | null;
  readonly periodo: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly numero: number;
  readonly fecha: string;
  readonly integrantes: string | null;
  readonly observaciones: string | null;
  readonly decisiones: readonly (DecisionActa & { readonly nombreEstudiante: string })[];
  readonly creadoEn: string;
}

export interface GuardarActa {
  anio: number;
  periodoId: string | null;
  grado: number;
  grupo: string | null;
  fecha: string;
  integrantes: string | null;
  observaciones: string | null;
  decisiones: DecisionActa[];
}

// ---------- Reportes oficiales ----------

export interface FilaSimat {
  readonly estudianteId: string;
  readonly tipoDocumento: string;
  readonly documento: string;
  readonly apellido1: string;
  readonly apellido2: string | null;
  readonly nombre1: string;
  readonly nombre2: string | null;
  readonly fechaNacimiento: string | null;
  readonly grado: number;
  readonly grupo: string | null;
  readonly jornada: string;
  readonly direccion: string | null;
  readonly eps: string | null;
  readonly acudiente: string | null;
  readonly documentoAcudiente: string | null;
  readonly telefonoAcudiente: string | null;
  readonly colegioProcedencia: string | null;
  readonly datosCompletos: boolean;
}

export interface AsignaturaLibro {
  readonly asignatura: string;
  readonly area: string;
  readonly intensidadHoraria: number | null;
  readonly notasPeriodos: readonly (number | null)[];
  readonly final: number | null;
  readonly desempeno: Desempeno | null;
  readonly fallas: number;
}

export interface EstudianteLibro {
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly asignaturas: readonly AsignaturaLibro[];
  readonly promedio: number | null;
  readonly perdidas: number;
  readonly fallas: number;
  readonly puesto: number | null;
  readonly decision: DecisionComision | null;
  readonly resultado: string;
}

export interface LibroFinal {
  readonly anio: number;
  readonly grado: number;
  readonly grupo: string | null;
  readonly periodos: readonly { readonly id: string; readonly numero: number; readonly nombre: string; readonly porcentaje: number }[];
  readonly anioCerrado: boolean;
  readonly estudiantes: readonly EstudianteLibro[];
  readonly generadoEn: string;
}

// ---------- Mensajería ----------

export interface ContactoMensaje {
  readonly id: string;
  readonly nombreCompleto: string;
  readonly rol: RolCampus;
  readonly detalle: string;
  readonly estudianteId: string;
  readonly estudiante: string;
}

export interface ConversacionResumen {
  readonly id: string;
  readonly asunto: string;
  readonly otroId: string;
  readonly otro: string;
  readonly otroRol: RolCampus;
  readonly estudianteId: string;
  readonly estudiante: string;
  readonly curso: string;
  readonly ultimoMensajeEn: string;
  readonly noLeida: boolean;
  readonly cerrada: boolean;
  readonly ultimoTexto: string | null;
}

export interface MensajeChat {
  readonly id: string;
  readonly autorId: string;
  readonly autor: string;
  readonly propio: boolean;
  readonly texto: string;
  readonly enviadoEn: string;
}

export interface Conversacion {
  readonly conversacion: ConversacionResumen;
  readonly mensajes: readonly MensajeChat[];
}

export interface Bandeja {
  readonly noLeidas: number;
  readonly conversaciones: readonly ConversacionResumen[];
}

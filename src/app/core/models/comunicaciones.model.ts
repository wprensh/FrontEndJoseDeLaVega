/** Circulares, calendario escolar, pre-matrícula (admisiones) y tablero del rector. */
import { RolCampus } from './campus.model';
import { TipoAnotacion, EstadoCaso, Periodo } from './academico.model';
import { AreaEvaluada, TipoPrueba } from './simulacro.model';

// ---------- Circulares ----------

export type PublicoCircular = 'Familias' | 'Acudientes' | 'Estudiantes' | 'Docentes' | 'Todos';

export const PUBLICOS_CIRCULAR: Readonly<Record<PublicoCircular, string>> = {
  Familias: 'Familias (acudientes y estudiantes)',
  Acudientes: 'Acudientes',
  Estudiantes: 'Estudiantes',
  Docentes: 'Docentes',
  Todos: 'Toda la comunidad',
};

export interface Circular {
  readonly id: string;
  readonly codigo: string;
  readonly anio: number;
  readonly numero: number;
  readonly titulo: string;
  readonly contenido: string;
  readonly publico: PublicoCircular;
  readonly grados: readonly number[];
  readonly requiereConfirmacion: boolean;
  readonly enlaceAdjunto: string | null;
  readonly publicadaEn: string | null;
  readonly creadoEn: string;
  readonly destinatarios: number;
  readonly leidas: number;
  readonly confirmadas: number;
}

export interface GuardarCircular {
  titulo: string;
  contenido: string;
  publico: PublicoCircular;
  grados: number[] | null;
  requiereConfirmacion: boolean;
  enlaceAdjunto: string | null;
}

export interface PendienteCircular {
  readonly miembroId: string;
  readonly nombreCompleto: string;
  readonly rol: RolCampus;
  readonly curso: string;
  readonly telefono: string | null;
  readonly leida: boolean;
}

export interface CircularCampus {
  readonly id: string;
  readonly codigo: string;
  readonly titulo: string;
  readonly contenido: string;
  readonly requiereConfirmacion: boolean;
  readonly enlaceAdjunto: string | null;
  readonly publicadaEn: string;
  readonly leida: boolean;
  readonly confirmada: boolean;
}

// ---------- Calendario ----------

export type TipoEvento = 'Academico' | 'Institucional' | 'Reunion' | 'Evaluacion' | 'Festivo' | 'Deportivo' | 'Cultural';

export const TIPOS_EVENTO: Readonly<Record<TipoEvento, string>> = {
  Academico: 'Académico',
  Institucional: 'Institucional',
  Reunion: 'Reunión',
  Evaluacion: 'Evaluación',
  Festivo: 'Festivo / sin clases',
  Deportivo: 'Deportivo',
  Cultural: 'Cultural',
};

export interface Evento {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly inicio: string;
  readonly fin: string;
  readonly hora: string | null;
  readonly lugar: string | null;
  readonly tipo: TipoEvento;
  readonly publico: boolean;
}

export interface GuardarEvento {
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string | null;
  hora: string | null;
  lugar: string | null;
  tipo: TipoEvento;
  publico: boolean;
}

// ---------- Admisiones (pre-matrícula en línea) ----------

export type TipoDocumentoAspirante =
  | 'RegistroCivil'
  | 'TarjetaIdentidad'
  | 'CedulaCiudadania'
  | 'CedulaExtranjeria'
  | 'PermisoProteccionTemporal'
  | 'Pasaporte'
  | 'Nuip';

export const TIPOS_DOCUMENTO_ASPIRANTE: Readonly<Record<TipoDocumentoAspirante, string>> = {
  RegistroCivil: 'Registro civil',
  TarjetaIdentidad: 'Tarjeta de identidad',
  Nuip: 'NUIP',
  CedulaCiudadania: 'Cédula de ciudadanía',
  CedulaExtranjeria: 'Cédula de extranjería',
  PermisoProteccionTemporal: 'Permiso por Protección Temporal (PPT)',
  Pasaporte: 'Pasaporte',
};

export type EstadoAdmision = 'Recibida' | 'EnRevision' | 'DocumentosPendientes' | 'Aprobada' | 'Rechazada' | 'Matriculada';

export const ESTADOS_ADMISION: Readonly<Record<EstadoAdmision, string>> = {
  Recibida: 'Recibida',
  EnRevision: 'En revisión',
  DocumentosPendientes: 'Documentos pendientes',
  Aprobada: 'Aprobada',
  Rechazada: 'No aprobada',
  Matriculada: 'Matriculada',
};

export type TipoDocumentoAdmision =
  | 'DocumentoIdentidad'
  | 'CertificadoNotas'
  | 'CarneVacunas'
  | 'AfiliacionSalud'
  | 'Foto'
  | 'Otro';

export const TIPOS_DOCUMENTO_ADMISION: Readonly<Record<TipoDocumentoAdmision, string>> = {
  DocumentoIdentidad: 'Documento de identidad del aspirante',
  CertificadoNotas: 'Certificado de notas del último año',
  CarneVacunas: 'Carné de vacunas',
  AfiliacionSalud: 'Certificado de afiliación a salud (EPS / SISBÉN)',
  Foto: 'Foto tipo documento',
  Otro: 'Otro documento',
};

export const TAMANO_MAXIMO_DOCUMENTO = 3 * 1024 * 1024;

export interface RadicarAdmision {
  anioLectivo: number;
  gradoSolicitado: number;
  aspiranteTipoDocumento: TipoDocumentoAspirante;
  aspiranteDocumento: string;
  aspiranteNombres: string;
  aspiranteApellidos: string;
  aspiranteFechaNacimiento: string;
  colegioProcedencia: string | null;
  direccion: string | null;
  eps: string | null;
  acudienteNombre: string;
  acudienteDocumento: string;
  acudienteParentesco: string | null;
  acudienteTelefono: string;
  acudienteCorreo: string | null;
  observaciones: string | null;
  aceptaTratamientoDatos: boolean;
}

export interface AdmisionRadicada {
  readonly radicado: string;
  readonly radicadaEn: string;
}

export interface DocumentoAdmision {
  readonly id: string;
  readonly tipo: TipoDocumentoAdmision;
  readonly nombreArchivo: string;
  readonly tipoContenido: string;
  readonly tamano: number;
  readonly creadoEn: string;
}

export interface EstadoAdmisionConsulta {
  readonly radicado: string;
  readonly nombreAspirante: string;
  readonly gradoSolicitado: number;
  readonly anioLectivo: number;
  readonly estado: EstadoAdmision;
  readonly mensajeFamilia: string | null;
  readonly radicadaEn: string;
  readonly estadoCambiadoEn: string | null;
  readonly admiteDocumentos: boolean;
  readonly documentos: readonly DocumentoAdmision[];
}

export interface SolicitudAdmision {
  readonly id: string;
  readonly radicado: string;
  readonly anioLectivo: number;
  readonly gradoSolicitado: number;
  readonly aspiranteTipoDocumento: TipoDocumentoAspirante;
  readonly aspiranteDocumento: string;
  readonly aspiranteNombres: string;
  readonly aspiranteApellidos: string;
  readonly aspiranteFechaNacimiento: string;
  readonly colegioProcedencia: string | null;
  readonly direccion: string | null;
  readonly eps: string | null;
  readonly acudienteNombre: string;
  readonly acudienteDocumento: string;
  readonly acudienteParentesco: string | null;
  readonly acudienteTelefono: string;
  readonly acudienteCorreo: string | null;
  readonly observaciones: string | null;
  readonly estado: EstadoAdmision;
  readonly mensajeFamilia: string | null;
  readonly notaInterna: string | null;
  readonly creadoEn: string;
  readonly estadoCambiadoEn: string | null;
  readonly estudianteId: string | null;
  readonly documentos: readonly DocumentoAdmision[];
}

export interface CambiarEstadoAdmision {
  estado: EstadoAdmision;
  mensajeFamilia: string | null;
  notaInterna: string | null;
}

export interface Matricula {
  readonly estudianteId: string;
  readonly acudienteId: string;
  readonly estudianteNuevo: boolean;
  readonly acudienteNuevo: boolean;
}

// ---------- Tablero del rector ----------

export interface Tablero {
  readonly fecha: string;
  readonly comunidad: {
    readonly estudiantes: number;
    readonly docentes: number;
    readonly acudientes: number;
    readonly estudiantesConAcudiente: number;
    readonly porGrado: readonly { readonly grado: number; readonly total: number }[];
  };
  readonly asistencia: {
    readonly clasesHoy: number;
    readonly ausenciasHoy: number;
    readonly tardesHoy: number;
    readonly porcentajeHoy: number | null;
    readonly porcentaje30Dias: number | null;
    readonly porGrado: readonly { readonly grado: number; readonly porcentaje: number }[];
    readonly masAusencias: readonly {
      readonly estudianteId: string;
      readonly nombreCompleto: string;
      readonly curso: string;
      readonly ausencias: number;
    }[];
  };
  readonly academico: {
    readonly periodo: Periodo | null;
    readonly promedioGeneral: number | null;
    readonly porGrado: readonly { readonly grado: number; readonly promedio: number }[];
    readonly porArea: readonly { readonly area: string; readonly promedio: number }[];
    readonly estudiantesConPerdidas: number;
    readonly porcentajeAprobacion: number | null;
    readonly notasRegistradas: number;
  };
  readonly convivencia: {
    readonly casosAbiertos: number;
    readonly abiertosPorTipo: readonly { readonly tipo: TipoAnotacion; readonly total: number }[];
    readonly anotacionesUltimos30Dias: number;
    readonly casosGraves: readonly {
      readonly id: string;
      readonly estudianteId: string;
      readonly estudiante: string;
      readonly curso: string;
      readonly tipo: TipoAnotacion;
      readonly fecha: string;
      readonly estado: EstadoCaso;
    }[];
  };
  readonly ultimoSimulacro: {
    readonly id: string;
    readonly titulo: string;
    readonly tipo: TipoPrueba;
    readonly presentados: number;
    readonly habilitados: number;
    readonly promedioPorcentaje: number;
    readonly promedioGlobal: number | null;
    readonly porArea: readonly { readonly area: AreaEvaluada; readonly preguntas: number; readonly promedio: number }[];
  } | null;
  readonly admisiones: {
    readonly anioLectivo: number;
    readonly porEstado: readonly { readonly estado: EstadoAdmision; readonly total: number }[];
    readonly porRevisar: number;
  };
  readonly ultimaCircular: {
    readonly id: string;
    readonly codigo: string;
    readonly titulo: string;
    readonly destinatarios: number;
    readonly leidas: number;
    readonly confirmadas: number;
    readonly requiereConfirmacion: boolean;
  } | null;
}

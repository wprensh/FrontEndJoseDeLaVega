/** Estudiante, docente o acudiente del campus virtual (MiembroCampus en la API). */
export type RolCampus = 'Estudiante' | 'Docente' | 'Acudiente';

export const ROLES_CAMPUS: Readonly<Record<RolCampus, string>> = {
  Estudiante: 'Estudiante',
  Docente: 'Docente',
  Acudiente: 'Acudiente',
};

/** Grados de la institución: 0 es transición y luego de 1° a 11°. */
export const GRADOS: readonly number[] = Array.from({ length: 12 }, (_, i) => i);

export function nombreGrado(grado: number | null | undefined): string {
  if (grado === null || grado === undefined) {
    return '';
  }
  return grado === 0 ? 'Transición' : `${grado}°`;
}

/** "7° A", "Transición B", "Docente" o "Acudiente". */
export function cursoDe(miembro: { rol?: RolCampus; grado: number | null; grupo: string | null }): string {
  if (miembro.rol === 'Docente' || miembro.rol === 'Acudiente') {
    return miembro.rol;
  }
  return [nombreGrado(miembro.grado), miembro.grupo].filter(Boolean).join(' ');
}

export interface MiembroCampus {
  readonly id: string;
  readonly rol: RolCampus;
  readonly documento: string;
  readonly nombreCompleto: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly activo: boolean;
  readonly tieneClave: boolean;
  readonly bloqueado: boolean;
  readonly ultimoAcceso: string | null;
  readonly creadoEn: string;
  readonly correo: string | null;
  readonly telefono: string | null;
  readonly codigoCarnet: string;
}

export interface CrearMiembro {
  rol: RolCampus;
  documento: string;
  nombreCompleto: string;
  grado: number | null;
  grupo: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface ActualizarMiembro {
  rol: RolCampus;
  nombreCompleto: string;
  grado: number | null;
  grupo: string | null;
  activo: boolean;
  correo: string | null;
  telefono: string | null;
}

export interface FilaImportacion {
  documento: string;
  nombreCompleto: string;
  grado: number | null;
  grupo: string | null;
}

export interface ResultadoImportacion {
  readonly creados: number;
  readonly actualizados: number;
  readonly errores: readonly { readonly fila: number; readonly documento: string; readonly mensaje: string }[];
}

export interface FiltroClaves {
  rol?: RolCampus | null;
  grado?: number | null;
  grupo?: string | null;
  soloSinClave?: boolean;
  ids?: string[];
}

/** Clave en texto claro: la API solo la entrega al generarla. */
export interface ClaveGenerada {
  readonly id: string;
  readonly documento: string;
  readonly nombreCompleto: string;
  readonly rol: RolCampus;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly clave: string;
}

// ---------- Sesión del campus ----------

/** Estudiante a cargo de un acudiente. */
export interface EstudianteVinculado {
  readonly id: string;
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly parentesco: string | null;
}

export interface PerfilCampus {
  readonly id: string;
  readonly rol: RolCampus;
  readonly documento: string;
  readonly nombreCompleto: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly codigoCarnet: string;
  /** Solo para acudientes: sus estudiantes. */
  readonly estudiantes: readonly EstudianteVinculado[];
}

export interface SesionCampus {
  readonly token: string;
  readonly expira: string;
  readonly perfil: PerfilCampus;
}

/**
 * Convierte la lista pegada desde Excel o del SIMAT (una persona por línea; columnas separadas por
 * tabulador, punto y coma o coma) en filas: documento, nombre completo, grado y grupo.
 * Se salta la fila de títulos si la hay.
 */
export function leerLista(texto: string, rol: RolCampus): FilaImportacion[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => linea.split(linea.includes('\t') ? '\t' : linea.includes(';') ? ';' : ',').map((c) => c.trim()))
    .filter((columnas, i) => !(i === 0 && /documento|nombre/i.test(columnas.join(' '))))
    .map(([documento = '', nombreCompleto = '', grado = '', grupo = '']) => ({
      documento,
      nombreCompleto,
      grado: rol === 'Docente' ? null : leerGrado(grado),
      grupo: rol === 'Docente' ? null : grupo || null,
    }));
}

/** "0", "transición", "T", "7", "7°" → número de grado; null si no se entiende. */
export function leerGrado(texto: string): number | null {
  const limpio = texto.trim().toLowerCase();
  if (/^(t|tr|transici[oó]n)$/.test(limpio)) {
    return 0;
  }
  const numero = Number.parseInt(limpio, 10);
  return Number.isInteger(numero) && numero >= 0 && numero <= 11 ? numero : null;
}

// ---------- Acudientes ----------

export interface Vinculo {
  readonly id: string;
  readonly acudienteId: string;
  readonly acudienteNombre: string;
  readonly acudienteDocumento: string;
  readonly acudienteTelefono: string | null;
  readonly acudienteCorreo: string | null;
  readonly estudianteId: string;
  readonly estudianteNombre: string;
  readonly estudianteDocumento: string;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly parentesco: string | null;
}

export interface FilaAcudiente {
  documentoAcudiente: string;
  nombreAcudiente: string;
  documentoEstudiante: string;
  parentesco: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface ResultadoImportacionAcudientes {
  readonly acudientesCreados: number;
  readonly acudientesActualizados: number;
  readonly vinculos: number;
  readonly errores: readonly { readonly fila: number; readonly documento: string; readonly mensaje: string }[];
}

/**
 * Lista de acudientes pegada desde Excel: documento del acudiente, nombre, documento del estudiante,
 * parentesco, correo y teléfono (los tres últimos opcionales).
 */
export function leerListaAcudientes(texto: string): FilaAcudiente[] {
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => linea.split(linea.includes('\t') ? '\t' : linea.includes(';') ? ';' : ',').map((c) => c.trim()))
    .filter((columnas, i) => !(i === 0 && /documento|nombre/i.test(columnas.join(' '))))
    .map(([documentoAcudiente = '', nombreAcudiente = '', documentoEstudiante = '', parentesco = '', correo = '', telefono = '']) => ({
      documentoAcudiente,
      nombreAcudiente,
      documentoEstudiante,
      parentesco: parentesco || null,
      correo: correo || null,
      telefono: telefono || null,
    }));
}

// ---------- Carné digital ----------

export interface VerificacionCarnet {
  readonly codigo: string;
  readonly nombreCompleto: string;
  readonly rol: RolCampus;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly documentoParcial: string;
  readonly vigente: boolean;
  readonly anioLectivo: number;
}

/** Enlace de WhatsApp (wa.me) para un celular colombiano, con un mensaje ya escrito. */
export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  if (digitos.length < 10) {
    return null;
  }
  const numero = digitos.length === 10 ? `57${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

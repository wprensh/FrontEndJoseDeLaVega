/** Estudiante o docente del campus virtual (MiembroCampus en la API). */
export type RolCampus = 'Estudiante' | 'Docente';

/** Grados de la institución: 0 es transición y luego de 1° a 11°. */
export const GRADOS: readonly number[] = Array.from({ length: 12 }, (_, i) => i);

export function nombreGrado(grado: number | null | undefined): string {
  if (grado === null || grado === undefined) {
    return '';
  }
  return grado === 0 ? 'Transición' : `${grado}°`;
}

/** "7° A", "Transición B" o "Docente". */
export function cursoDe(miembro: { rol: RolCampus; grado: number | null; grupo: string | null }): string {
  return miembro.rol === 'Docente' ? 'Docente' : [nombreGrado(miembro.grado), miembro.grupo].filter(Boolean).join(' ');
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
}

export interface CrearMiembro {
  rol: RolCampus;
  documento: string;
  nombreCompleto: string;
  grado: number | null;
  grupo: string | null;
}

export interface ActualizarMiembro {
  rol: RolCampus;
  nombreCompleto: string;
  grado: number | null;
  grupo: string | null;
  activo: boolean;
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

export interface PerfilCampus {
  readonly id: string;
  readonly rol: RolCampus;
  readonly documento: string;
  readonly nombreCompleto: string;
  readonly grado: number | null;
  readonly grupo: string | null;
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

import { Asignacion } from './academico.model';
import { nombreGrado } from './campus.model';

/** Una clase en el horario semanal. Día: lunes = 1 … sábado = 6. Horas en formato "HH:mm:ss". */
export interface BloqueHorario {
  readonly id: string;
  readonly asignacionId: string;
  readonly dia: number;
  readonly inicio: string;
  readonly fin: string;
  readonly asignatura: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly docenteId: string;
  readonly docenteNombre: string;
}

export interface AsignacionHorario {
  readonly asignacion: Asignacion;
  readonly horasProgramadas: number;
}

export interface Horario {
  readonly asignaciones: readonly AsignacionHorario[];
  readonly bloques: readonly BloqueHorario[];
}

export interface GuardarBloque {
  asignacionId: string;
  dia: number;
  inicio: string;
  fin: string;
}

/** Asignación académica semanal de un docente de secundaria y media (Decreto 1850 de 2002). */
export const HORAS_SEMANALES_DOCENTE = 22;

export const DIAS_SEMANA: readonly string[] = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * El calendario trabaja sobre una semana fija: el lunes 1 de enero de 2024. Así cada día de la semana
 * corresponde a una fecha y el horario no depende de la semana actual.
 */
const LUNES_REFERENCIA = '2024-01-0';

export function fechaDelDia(dia: number, hora: string): string {
  return `${LUNES_REFERENCIA}${dia}T${hora.length === 5 ? hora + ':00' : hora}`;
}

/** Día (1–6) y hora "HH:mm" de una fecha de la semana de referencia. */
export function diaYHora(fecha: Date): { dia: number; hora: string } {
  const dia = fecha.getDay() === 0 ? 7 : fecha.getDay();
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  return { dia, hora };
}

export function nombreCurso(grado: number, grupo: string | null): string {
  return [nombreGrado(grado), grupo].filter(Boolean).join(' ');
}

/** "6:30 a. m." a partir de "06:30:00". */
export function horaLegible(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${sufijo}`;
}

const COLORES = ['#1d4f91', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#a21caf', '#c2410c', '#0e7490', '#475569'];

/** Color estable por clave (curso o asignatura) para distinguir las clases en el calendario. */
export function colorDe(clave: string): string {
  let h = 0;
  for (const c of clave) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  return COLORES[h % COLORES.length];
}

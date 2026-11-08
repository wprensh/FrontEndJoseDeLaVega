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

/** Hora de clase o descanso de la jornada. Horas en formato "HH:mm". */
export interface FranjaJornada {
  readonly etiqueta: string;
  readonly inicio: string;
  readonly fin: string;
  readonly descanso: boolean;
}

export interface Jornada {
  readonly nombre: string;
  readonly franjas: readonly FranjaJornada[];
}

/** Horario de bachillerato JDV 2026: seis horas de 50 minutos con dos descansos, de 1:00 a 6:30 p. m. */
export const JORNADA_BACHILLERATO: Jornada = {
  nombre: 'Bachillerato JDV 2026',
  franjas: [
    { etiqueta: '1.ª hora', inicio: '13:00', fin: '13:50', descanso: false },
    { etiqueta: '2.ª hora', inicio: '13:50', fin: '14:40', descanso: false },
    { etiqueta: 'Descanso 1', inicio: '14:40', fin: '15:00', descanso: true },
    { etiqueta: '3.ª hora', inicio: '15:00', fin: '15:50', descanso: false },
    { etiqueta: '4.ª hora', inicio: '15:50', fin: '16:40', descanso: false },
    { etiqueta: 'Descanso 2', inicio: '16:40', fin: '16:50', descanso: true },
    { etiqueta: '5.ª hora', inicio: '16:50', fin: '17:40', descanso: false },
    { etiqueta: '6.ª hora', inicio: '17:40', fin: '18:30', descanso: false },
  ],
};

const minutos = (hora: string): number => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const hhmm = (total: number): string =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/** Horas de clase (sin descansos), en orden. */
export function horasDeClase(jornada: Jornada): FranjaJornada[] {
  return jornada.franjas.filter((f) => !f.descanso);
}

/**
 * Ajusta una franja a las horas de clase de la jornada: empieza al inicio de la hora de clase donde cae
 * (o de la siguiente, si cae en un descanso) y ocupa `horas` horas seguidas sin atravesar un descanso.
 * Devuelve null si cae después de la última hora.
 */
export function franjaEnJornada(jornada: Jornada, inicio: string, horas: number): { inicio: string; fin: string } | null {
  const franjas = jornada.franjas;
  const t = minutos(inicio);
  let i = franjas.findIndex((f) => t < minutos(f.fin));
  if (i < 0) {
    return null;
  }
  while (i < franjas.length && franjas[i].descanso) {
    i++;
  }
  if (i >= franjas.length) {
    return null;
  }
  let j = i;
  for (let n = 1; n < horas && j + 1 < franjas.length && !franjas[j + 1].descanso; n++) {
    j++;
  }
  return { inicio: franjas[i].inicio, fin: franjas[j].fin };
}

/** Cuántas horas de clase de la jornada cubre una franja (al menos 1). */
export function horasCubiertas(jornada: Jornada, inicio: string, fin: string): number {
  const a = minutos(inicio);
  const b = minutos(fin);
  const n = horasDeClase(jornada).filter((f) => minutos(f.inicio) < b && a < minutos(f.fin)).length;
  return Math.max(1, n);
}

/** Primera y última hora que debe mostrar el calendario: la jornada, ampliada si hay clases por fuera. */
export function rangoVisible(jornada: Jornada, bloques: readonly { inicio: string; fin: string }[]): { desde: string; hasta: string } {
  const desde = Math.min(minutos(jornada.franjas[0].inicio), ...bloques.map((b) => minutos(b.inicio)));
  const hasta = Math.max(minutos(jornada.franjas[jornada.franjas.length - 1].fin), ...bloques.map((b) => minutos(b.fin)));
  return { desde: hhmm(desde), hasta: hhmm(hasta) };
}

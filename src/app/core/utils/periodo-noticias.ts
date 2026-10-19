import { formatDate } from '@angular/common';

import { OrdenNoticias } from '../models/noticia.model';
import { aFechaIso, desdeFechaIso } from './fechas';

/**
 * Periodo elegido en el filtro de "Noticias recientes":
 * un atajo, un rango personalizado o un mes del archivo ("2026-09").
 */
export type PeriodoNoticias = 'todas' | 'mes' | 'trimestre' | 'anio' | 'personalizado' | `${number}-${number}`;

export interface FiltroFechasNoticias {
  readonly periodo: PeriodoNoticias;
  /** Solo para el periodo "personalizado": fechas ISO "yyyy-MM-dd". */
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly orden: OrdenNoticias;
}

export interface RangoFechas {
  readonly desde: string | null;
  readonly hasta: string | null;
}

export const FILTRO_FECHAS_INICIAL: FiltroFechasNoticias = { periodo: 'todas', desde: null, hasta: null, orden: 'Recientes' };

export const ATAJOS_PERIODO: readonly { valor: PeriodoNoticias; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'trimestre', etiqueta: 'Últimos 3 meses' },
  { valor: 'anio', etiqueta: 'Este año' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
];

const PATRON_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esMesDeArchivo(periodo: string): periodo is `${number}-${number}` {
  return PATRON_MES.test(periodo);
}

/** Clave de un mes del archivo: (2026, 9) → "2026-09". */
export function claveMes(anio: number, mes: number): `${number}-${number}` {
  return `${anio}-${String(mes).padStart(2, '0')}` as `${number}-${number}`;
}

/** Fecha ISO real (descarta "2026-02-31" y textos que no son fechas). */
function esFechaIsoValida(valor: string | null): valor is string {
  return valor !== null && PATRON_FECHA.test(valor) && aFechaIso(desdeFechaIso(valor)) === valor;
}

/**
 * Rango de fechas (inclusivo) que se envía a la API.
 * Los atajos se calculan respecto a `hoy`; "Este mes" y "Este año" incluyen fechas futuras
 * del periodo para no ocultar eventos ya anunciados.
 */
export function rangoDelFiltro(filtro: FiltroFechasNoticias, hoy: Date = new Date()): RangoFechas {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();

  switch (filtro.periodo) {
    case 'todas':
      return { desde: null, hasta: null };
    case 'mes':
      return { desde: aFechaIso(new Date(anio, mes, 1)), hasta: aFechaIso(new Date(anio, mes + 1, 0)) };
    case 'trimestre': {
      // Mismo día de hace tres meses, ajustado al último día si ese mes es más corto (31 may → 28 feb).
      const dia = Math.min(hoy.getDate(), new Date(anio, mes - 2, 0).getDate());
      return { desde: aFechaIso(new Date(anio, mes - 3, dia)), hasta: null };
    }
    case 'anio':
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    case 'personalizado':
      return { desde: filtro.desde, hasta: filtro.hasta };
    default: {
      const [a, m] = filtro.periodo.split('-').map(Number);
      return { desde: aFechaIso(new Date(a, m - 1, 1)), hasta: aFechaIso(new Date(a, m, 0)) };
    }
  }
}

/** Lee el filtro de los parámetros de la URL (?periodo=…&desde=…&hasta=…&orden=antiguas); ignora lo inválido. */
export function filtroDesdeUrl(parametros: { get(nombre: string): string | null }): FiltroFechasNoticias {
  const periodo = parametros.get('periodo') ?? 'todas';
  const orden: OrdenNoticias = parametros.get('orden') === 'antiguas' ? 'Antiguas' : 'Recientes';
  const esAtajo = ATAJOS_PERIODO.some((a) => a.valor === periodo);

  if (!esAtajo && !esMesDeArchivo(periodo)) {
    return { ...FILTRO_FECHAS_INICIAL, orden };
  }
  if (periodo !== 'personalizado') {
    return { periodo: periodo as PeriodoNoticias, desde: null, hasta: null, orden };
  }

  const desde = parametros.get('desde');
  const hasta = parametros.get('hasta');
  return {
    periodo,
    desde: esFechaIsoValida(desde) ? desde : null,
    hasta: esFechaIsoValida(hasta) ? hasta : null,
    orden,
  };
}

/** Parámetros de URL del filtro; los valores por defecto se omiten para que el enlace quede limpio. */
export function filtroAParametrosUrl(filtro: FiltroFechasNoticias): Record<string, string> {
  const parametros: Record<string, string> = {};
  if (filtro.periodo !== 'todas') {
    parametros['periodo'] = filtro.periodo;
  }
  if (filtro.periodo === 'personalizado') {
    if (filtro.desde) parametros['desde'] = filtro.desde;
    if (filtro.hasta) parametros['hasta'] = filtro.hasta;
  }
  if (filtro.orden === 'Antiguas') {
    parametros['orden'] = 'antiguas';
  }
  return parametros;
}

/**
 * Complemento que sigue a "noticias publicadas …": "este mes", "en septiembre de 2026",
 * "del 1 de sept 2026 al 30 de sept 2026"…
 */
export function describirPeriodo(filtro: FiltroFechasNoticias, locale: string): string {
  const fecha = (iso: string): string => formatDate(desdeFechaIso(iso), "d 'de' MMM y", locale);

  switch (filtro.periodo) {
    case 'todas':
      return 'en todas las fechas';
    case 'mes':
      return 'este mes';
    case 'trimestre':
      return 'en los últimos 3 meses';
    case 'anio':
      return 'este año';
    case 'personalizado':
      if (filtro.desde && filtro.hasta) return `del ${fecha(filtro.desde)} al ${fecha(filtro.hasta)}`;
      if (filtro.desde) return `desde el ${fecha(filtro.desde)}`;
      if (filtro.hasta) return `hasta el ${fecha(filtro.hasta)}`;
      return 'en todas las fechas';
    default:
      return `en ${formatDate(desdeFechaIso(`${filtro.periodo}-01`), "MMMM 'de' y", locale)}`;
  }
}

import { MODULOS, Modulo } from './usuario.model';

/** Opción del menú lateral del panel. Se muestra si el usuario puede ver su módulo. */
export interface OpcionMenu {
  readonly etiqueta: string;
  readonly icono: string;
  readonly ruta: string;
  readonly modulo: Modulo;
}

export interface GrupoMenu {
  readonly area: string;
  readonly opciones: readonly OpcionMenu[];
}

/** Pantallas que no son un módulo propio sino parte de uno (usan sus permisos). */
const PANTALLAS_EXTRA: readonly (OpcionMenu & { despuesDe: Modulo })[] = [
  { etiqueta: 'Horarios', icono: 'schedule', ruta: '/admin/horarios', modulo: 'Academico', despuesDe: 'Academico' },
];

/** Áreas del menú y los módulos de cada una, en orden. */
const AREAS: readonly { area: string; modulos: readonly Modulo[] }[] = [
  { area: 'Comunicación', modulos: ['Noticias', 'Circulares', 'Calendario'] },
  { area: 'Académico', modulos: ['Academico', 'Convivencia', 'Simulacros', 'Indicadores'] },
  { area: 'Comunidad', modulos: ['Campus', 'Carnets', 'Admisiones', 'Elecciones'] },
  { area: 'Administración', modulos: ['Certificados', 'Usuarios', 'Pqrs'] },
];

function opcion(modulo: Modulo): OpcionMenu[] {
  const info = MODULOS.find((m) => m.modulo === modulo);
  const propia: OpcionMenu[] = info?.ruta ? [{ etiqueta: info.etiqueta, icono: info.icono, ruta: info.ruta, modulo }] : [];
  const extras = PANTALLAS_EXTRA.filter((p) => p.despuesDe === modulo).map(({ despuesDe: _, ...o }) => o);
  return [...propia, ...extras];
}

/**
 * Menú del panel agrupado por área. Un módulo nuevo con ruta que no esté en ninguna área
 * aparece en "Otros", para que nunca quede sin acceso.
 */
export const MENU_PANEL: readonly GrupoMenu[] = (() => {
  const ubicados = new Set(AREAS.flatMap((a) => a.modulos));
  const grupos = AREAS.map((a) => ({ area: a.area, opciones: a.modulos.flatMap(opcion) }));
  const otros = MODULOS.filter((m) => !ubicados.has(m.modulo)).flatMap((m) => opcion(m.modulo));
  return otros.length ? [...grupos, { area: 'Otros', opciones: otros }] : grupos;
})();

/** Grupos con solo las opciones que el usuario puede ver; sin grupos vacíos. */
export function menuVisible(puedeVer: (modulo: Modulo) => boolean): GrupoMenu[] {
  return MENU_PANEL.map((g) => ({ area: g.area, opciones: g.opciones.filter((o) => puedeVer(o.modulo)) })).filter(
    (g) => g.opciones.length,
  );
}

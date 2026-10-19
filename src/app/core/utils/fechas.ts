/** Date → "yyyy-MM-dd" (DateOnly en .NET) usando la fecha local, sin desfase por zona horaria. */
export function aFechaIso(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** "yyyy-MM-dd" → Date a medianoche local (evita que "2026-09-21" se muestre como el día 20). */
export function desdeFechaIso(valor: string): Date {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const DIAS_EN_LETRAS = [
  '', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho',
  'veintinueve', 'treinta', 'treinta y un',
];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Fórmula de cierre de los certificados:
 * "a los diecinueve (19) días del mes de octubre de 2026" / "al primer (1) día del mes de ...".
 */
export function fechaEnLetras(valor: string): string {
  const fecha = desdeFechaIso(valor);
  const dia = fecha.getDate();
  const mes = MESES[fecha.getMonth()];
  const anio = fecha.getFullYear();
  return dia === 1
    ? `al primer (1) día del mes de ${mes} de ${anio}`
    : `a los ${DIAS_EN_LETRAS[dia]} (${dia}) días del mes de ${mes} de ${anio}`;
}

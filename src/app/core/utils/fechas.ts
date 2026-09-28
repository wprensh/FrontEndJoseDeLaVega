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

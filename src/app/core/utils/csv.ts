/** Descarga una tabla como CSV (separado por punto y coma, como lo abre Excel en español). */
export function descargarCsv(nombreArchivo: string, encabezados: readonly string[], filas: readonly (readonly unknown[])[]): void {
  const celda = (valor: unknown): string => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = [encabezados, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n');
  // BOM para que Excel reconozca las tildes.
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  descargarBlob(blob, nombreArchivo);
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

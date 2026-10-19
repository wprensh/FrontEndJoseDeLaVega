import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const PATRON_DIA_MES_ANIO = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*$/;

/**
 * Adaptador de fechas de los calendarios de Angular Material.
 * El adaptador nativo muestra "1/7/2026" (1 de julio, formato de Colombia) pero al escribirla la
 * interpreta con Date.parse como 7 de enero. Este adaptador lee día/mes/año al escribir la fecha.
 */
@Injectable()
export class AdaptadorFechaColombia extends NativeDateAdapter {
  override parse(valor: unknown, formato?: object): Date | null {
    if (typeof valor === 'string') {
      const coincidencia = PATRON_DIA_MES_ANIO.exec(valor);
      if (coincidencia) {
        const [, dia, mes, anio] = coincidencia.map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        // Descarta fechas imposibles como 31/2/2026, que Date convertiría en 3 de marzo.
        return fecha.getDate() === dia && fecha.getMonth() === mes - 1 ? fecha : this.invalid();
      }
    }
    return super.parse(valor, formato);
  }
}

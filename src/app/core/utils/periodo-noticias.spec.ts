import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { convertToParamMap } from '@angular/router';

import {
  FILTRO_FECHAS_INICIAL,
  FiltroFechasNoticias,
  describirPeriodo,
  filtroAParametrosUrl,
  filtroDesdeUrl,
  rangoDelFiltro,
} from './periodo-noticias';

describe('periodo-noticias', () => {
  const hoy = new Date(2026, 9, 19); // 19 de octubre de 2026
  const filtro = (cambios: Partial<FiltroFechasNoticias>): FiltroFechasNoticias => ({ ...FILTRO_FECHAS_INICIAL, ...cambios });

  beforeAll(() => registerLocaleData(localeEsCo));

  describe('rangoDelFiltro', () => {
    it('"Todas" no limita las fechas', () => {
      expect(rangoDelFiltro(filtro({}), hoy)).toEqual({ desde: null, hasta: null });
    });

    it('"Este mes" cubre el mes completo', () => {
      expect(rangoDelFiltro(filtro({ periodo: 'mes' }), hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    });

    it('"Últimos 3 meses" empieza el mismo día de hace tres meses', () => {
      expect(rangoDelFiltro(filtro({ periodo: 'trimestre' }), hoy)).toEqual({ desde: '2026-07-19', hasta: null });
    });

    it('"Últimos 3 meses" se ajusta al último día de un mes más corto', () => {
      expect(rangoDelFiltro(filtro({ periodo: 'trimestre' }), new Date(2026, 4, 31))).toEqual({ desde: '2026-02-28', hasta: null });
    });

    it('"Este año" cubre del 1 de enero al 31 de diciembre', () => {
      expect(rangoDelFiltro(filtro({ periodo: 'anio' }), hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    });

    it('un mes del archivo cubre ese mes completo (incluye años bisiestos)', () => {
      expect(rangoDelFiltro(filtro({ periodo: '2024-02' }), hoy)).toEqual({ desde: '2024-02-01', hasta: '2024-02-29' });
    });

    it('"Personalizado" usa las fechas elegidas', () => {
      const personalizado = filtro({ periodo: 'personalizado', desde: '2026-09-01', hasta: '2026-09-15' });
      expect(rangoDelFiltro(personalizado, hoy)).toEqual({ desde: '2026-09-01', hasta: '2026-09-15' });
    });
  });

  describe('URL', () => {
    it('ida y vuelta conserva el filtro', () => {
      const original = filtro({ periodo: 'personalizado', desde: '2026-09-01', hasta: '2026-09-30', orden: 'Antiguas' });
      const parametros = filtroAParametrosUrl(original);

      expect(parametros).toEqual({ periodo: 'personalizado', desde: '2026-09-01', hasta: '2026-09-30', orden: 'antiguas' });
      expect(filtroDesdeUrl(convertToParamMap(parametros))).toEqual(original);
    });

    it('el filtro por defecto no agrega parámetros', () => {
      expect(filtroAParametrosUrl(FILTRO_FECHAS_INICIAL)).toEqual({});
    });

    it('ignora periodos y fechas inválidos', () => {
      expect(filtroDesdeUrl(convertToParamMap({ periodo: 'siempre' }))).toEqual(FILTRO_FECHAS_INICIAL);
      expect(filtroDesdeUrl(convertToParamMap({ periodo: '2026-13' }))).toEqual(FILTRO_FECHAS_INICIAL);
      expect(filtroDesdeUrl(convertToParamMap({ periodo: 'personalizado', desde: '2026-02-31', hasta: 'ayer' }))).toEqual(
        filtro({ periodo: 'personalizado' }),
      );
    });

    it('acepta un mes del archivo', () => {
      expect(filtroDesdeUrl(convertToParamMap({ periodo: '2026-09' }))).toEqual(filtro({ periodo: '2026-09' }));
    });
  });

  describe('describirPeriodo', () => {
    it('describe atajos, meses y rangos en español', () => {
      expect(describirPeriodo(filtro({ periodo: 'mes' }), 'es-CO')).toBe('este mes');
      expect(describirPeriodo(filtro({ periodo: '2026-09' }), 'es-CO')).toBe('en septiembre de 2026');
      expect(describirPeriodo(filtro({ periodo: 'personalizado', desde: '2026-09-01', hasta: '2026-09-30' }), 'es-CO')).toMatch(
        /^del 1 de sept?\.? 2026 al 30 de sept?\.? 2026$/,
      );
    });
  });
});

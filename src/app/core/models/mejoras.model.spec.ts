import { DECISIONES, ESTADOS_PLANEACION, tamanoLegible } from './mejoras.model';

describe('mejoras.model', () => {
  it('muestra el tamaño de los archivos del aula en KB o MB', () => {
    expect(tamanoLegible(300)).toBe('1 KB');
    expect(tamanoLegible(150 * 1024)).toBe('150 KB');
    expect(tamanoLegible(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });

  it('tiene etiqueta para cada decisión de la comisión y estado de planeación', () => {
    expect(Object.keys(DECISIONES).length).toBe(6);
    expect(ESTADOS_PLANEACION.Devuelta).toContain('observaciones');
  });
});

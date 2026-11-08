import { MENU_PANEL, menuVisible } from './menu-panel';
import { MODULOS } from './usuario.model';

describe('Menú del panel', () => {
  it('incluye cada módulo con pantalla y la pantalla de horarios', () => {
    const rutas = MENU_PANEL.flatMap((g) => g.opciones.map((o) => o.ruta));
    for (const m of MODULOS.filter((x) => x.ruta)) {
      expect(rutas).toContain(m.ruta!);
    }
    expect(rutas).toContain('/admin/horarios');
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it('deja solo lo que el usuario puede ver y quita las áreas vacías', () => {
    const menu = menuVisible((m) => m === 'Academico');
    expect(menu.map((g) => g.area)).toEqual(['Académico']);
    expect(menu[0].opciones.map((o) => o.etiqueta)).toEqual(['Académico', 'Horarios']);
  });
});

import { JORNADA_BACHILLERATO as J, franjaEnJornada, horasCubiertas, rangoVisible } from './horario.model';

describe('Jornada de bachillerato', () => {
  it('ajusta una clase al inicio de la hora de clase donde cae', () => {
    expect(franjaEnJornada(J, '13:20', 1)).toEqual({ inicio: '13:00', fin: '13:50' });
    expect(franjaEnJornada(J, '15:00', 2)).toEqual({ inicio: '15:00', fin: '16:40' });
  });

  it('pasa a la siguiente hora si cae en un descanso y no atraviesa descansos', () => {
    expect(franjaEnJornada(J, '14:45', 1)).toEqual({ inicio: '15:00', fin: '15:50' });
    expect(franjaEnJornada(J, '13:50', 2)).toEqual({ inicio: '13:50', fin: '14:40' });
    expect(franjaEnJornada(J, '18:40', 1)).toBeNull();
  });

  it('cuenta las horas de clase de un bloque', () => {
    expect(horasCubiertas(J, '16:50', '18:30')).toBe(2);
    expect(horasCubiertas(J, '13:00', '13:50')).toBe(1);
  });

  it('muestra la jornada y la amplía si hay clases por fuera', () => {
    expect(rangoVisible(J, [])).toEqual({ desde: '13:00', hasta: '18:30' });
    expect(rangoVisible(J, [{ inicio: '06:30:00', fin: '07:30:00' }])).toEqual({ desde: '06:30', hasta: '18:30' });
  });
});

import { cursoDe, leerGrado, leerLista } from './campus.model';

describe('Lista de estudiantes pegada desde Excel', () => {
  it('lee columnas separadas por tabulador y se salta la fila de títulos', () => {
    const filas = leerLista('Documento\tNombre\tGrado\tGrupo\n1043555\tAna Pérez\t11\tA\n\n2002\tLuis Mora\tTransición\tB', 'Estudiante');

    expect(filas).toEqual([
      { documento: '1043555', nombreCompleto: 'Ana Pérez', grado: 11, grupo: 'A' },
      { documento: '2002', nombreCompleto: 'Luis Mora', grado: 0, grupo: 'B' },
    ]);
  });

  it('acepta punto y coma y deja sin grado a los docentes', () => {
    expect(leerLista('73123;Carlos Gómez;9;A', 'Docente')).toEqual([
      { documento: '73123', nombreCompleto: 'Carlos Gómez', grado: null, grupo: null },
    ]);
  });

  it('entiende el grado escrito de varias formas', () => {
    expect(leerGrado('7°')).toBe(7);
    expect(leerGrado('T')).toBe(0);
    expect(leerGrado('12')).toBeNull();
    expect(leerGrado('')).toBeNull();
  });

  it('muestra el curso como grado y grupo', () => {
    expect(cursoDe({ rol: 'Estudiante', grado: 0, grupo: 'A' })).toBe('Transición A');
    expect(cursoDe({ rol: 'Docente', grado: null, grupo: null })).toBe('Docente');
  });
});

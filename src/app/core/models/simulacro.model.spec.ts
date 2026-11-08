import { enlaceWhatsApp } from './campus.model';
import { leerPreguntas } from './simulacro.model';

describe('leerPreguntas', () => {
  it('lee área, opciones, la correcta y la explicación', () => {
    const { preguntas, errores } = leerPreguntas(
      `[Lectura crítica] ¿Qué es un texto argumentativo?
A) Uno que narra
*B) Uno que defiende una idea
C) Uno que describe
Explicación: Busca convencer.

1) ¿Cuánto es 2 + 2?
A) 3
*B) 4`,
      'Matematicas',
    );
    expect(errores).toEqual([]);
    expect(preguntas.length).toBe(2);
    expect(preguntas[0].area).toBe('LecturaCritica');
    expect(preguntas[0].correcta).toBe(1);
    expect(preguntas[0].explicacion).toBe('Busca convencer.');
    expect(preguntas[1].area).toBe('Matematicas');
    expect(preguntas[1].enunciado).toBe('¿Cuánto es 2 + 2?');
  });

  it('informa las preguntas sin respuesta marcada', () => {
    const { preguntas, errores } = leerPreguntas('¿Pregunta?\nA) Uno\nB) Dos', 'Matematicas');
    expect(preguntas.length).toBe(0);
    expect(errores[0]).toContain('asterisco');
  });
});

describe('enlaceWhatsApp', () => {
  it('agrega el indicativo de Colombia a un celular de 10 dígitos', () => {
    expect(enlaceWhatsApp('300 123 4567', 'Hola')).toBe('https://wa.me/573001234567?text=Hola');
  });

  it('no arma enlace sin un número válido', () => {
    expect(enlaceWhatsApp('', 'Hola')).toBeNull();
  });
});

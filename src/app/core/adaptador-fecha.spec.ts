import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE } from '@angular/material/core';

import { AdaptadorFechaColombia } from './adaptador-fecha';

describe('AdaptadorFechaColombia', () => {
  let adaptador: AdaptadorFechaColombia;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdaptadorFechaColombia, { provide: MAT_DATE_LOCALE, useValue: 'es-CO' }],
    });
    adaptador = TestBed.inject(AdaptadorFechaColombia);
  });

  it('lee las fechas escritas como día/mes/año', () => {
    expect(adaptador.parse('1/7/2026')).toEqual(new Date(2026, 6, 1));
    expect(adaptador.parse('31-08-2026')).toEqual(new Date(2026, 7, 31));
  });

  it('marca como inválidas las fechas imposibles', () => {
    expect(adaptador.isValid(adaptador.parse('31/2/2026')!)).toBeFalse();
  });
});

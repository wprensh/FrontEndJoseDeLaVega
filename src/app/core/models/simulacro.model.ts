/** Simulacros tipo Saber 11 y Saber 3°, 5° y 9° (mismos nombres que la API). */

export type TipoPrueba = 'Saber11' | 'Saber9' | 'Saber5' | 'Saber3' | 'Interna';
export type AreaEvaluada =
  | 'LecturaCritica'
  | 'Matematicas'
  | 'SocialesCiudadanas'
  | 'CienciasNaturales'
  | 'Ingles'
  | 'Lenguaje'
  | 'CompetenciasCiudadanas';
export type EstadoSimulacro = 'Programado' | 'Abierto' | 'Cerrado';
export type EstadoIntento = 'SinIniciar' | 'EnCurso' | 'Entregado';

export const TIPOS_PRUEBA: Readonly<Record<TipoPrueba, string>> = {
  Saber11: 'Saber 11',
  Saber9: 'Saber 9°',
  Saber5: 'Saber 5°',
  Saber3: 'Saber 3°',
  Interna: 'Prueba interna',
};

/** Grados que presentan cada prueba oficial; la interna sirve para cualquiera. */
export const GRADOS_PRUEBA: Readonly<Record<TipoPrueba, readonly number[]>> = {
  Saber11: [10, 11],
  Saber9: [8, 9],
  Saber5: [4, 5],
  Saber3: [2, 3],
  Interna: [],
};

export const AREAS: Readonly<Record<AreaEvaluada, string>> = {
  LecturaCritica: 'Lectura crítica',
  Matematicas: 'Matemáticas',
  SocialesCiudadanas: 'Sociales y ciudadanas',
  CienciasNaturales: 'Ciencias naturales',
  Ingles: 'Inglés',
  Lenguaje: 'Lenguaje',
  CompetenciasCiudadanas: 'Competencias ciudadanas',
};

/** Áreas que evalúa cada prueba, en el orden del ICFES. */
export const AREAS_PRUEBA: Readonly<Record<TipoPrueba, readonly AreaEvaluada[]>> = {
  Saber11: ['LecturaCritica', 'Matematicas', 'SocialesCiudadanas', 'CienciasNaturales', 'Ingles'],
  Saber9: ['Lenguaje', 'Matematicas', 'CienciasNaturales', 'CompetenciasCiudadanas'],
  Saber5: ['Lenguaje', 'Matematicas', 'CienciasNaturales', 'CompetenciasCiudadanas'],
  Saber3: ['Lenguaje', 'Matematicas'],
  Interna: ['LecturaCritica', 'Matematicas', 'SocialesCiudadanas', 'CienciasNaturales', 'Ingles', 'Lenguaje', 'CompetenciasCiudadanas'],
};

export const ESTADOS_SIMULACRO: Readonly<Record<EstadoSimulacro, string>> = {
  Programado: 'Programado',
  Abierto: 'Abierto',
  Cerrado: 'Cerrado',
};

export const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;
export const OPCIONES_MAXIMAS = 5;

export interface Simulacro {
  readonly id: string;
  readonly titulo: string;
  readonly instrucciones: string | null;
  readonly tipo: TipoPrueba;
  readonly grados: readonly number[];
  readonly inicio: string;
  readonly fin: string;
  readonly duracionMinutos: number;
  readonly mostrarRespuestas: boolean;
  readonly estado: EstadoSimulacro;
  readonly totalPreguntas: number;
  readonly presentados: number;
  readonly creadoEn: string;
}

export interface GuardarSimulacro {
  titulo: string;
  instrucciones: string | null;
  tipo: TipoPrueba;
  grados: number[];
  inicio: string;
  fin: string;
  duracionMinutos: number;
  mostrarRespuestas: boolean;
}

export interface Pregunta {
  readonly id: string;
  readonly orden: number;
  readonly area: AreaEvaluada;
  readonly competencia: string | null;
  readonly contexto: string | null;
  readonly enunciado: string;
  readonly imagenUrl: string | null;
  readonly opciones: readonly string[];
  readonly correcta: number;
  readonly explicacion: string | null;
}

export interface GuardarPregunta {
  id: string | null;
  area: AreaEvaluada;
  competencia: string | null;
  contexto: string | null;
  enunciado: string;
  imagenUrl: string | null;
  opciones: string[];
  correcta: number;
  explicacion: string | null;
}

export interface SimulacroDetalle {
  readonly simulacro: Simulacro;
  readonly preguntas: readonly Pregunta[];
}

export interface PuntajeArea {
  readonly area: AreaEvaluada;
  readonly aciertos: number;
  readonly total: number;
  readonly porcentaje: number;
}

export interface ResultadosSimulacro {
  readonly simulacro: Simulacro;
  readonly habilitados: number;
  readonly presentados: number;
  readonly enCurso: number;
  readonly promedioPorcentaje: number;
  readonly promedioGlobal: number | null;
  readonly porArea: readonly { readonly area: AreaEvaluada; readonly preguntas: number; readonly promedio: number }[];
  readonly porCompetencia: readonly { readonly area: AreaEvaluada; readonly competencia: string; readonly promedio: number }[];
  readonly porCurso: readonly {
    readonly grado: number;
    readonly grupo: string | null;
    readonly presentados: number;
    readonly promedio: number;
    readonly promedioGlobal: number | null;
  }[];
  readonly porPregunta: readonly {
    readonly preguntaId: string;
    readonly orden: number;
    readonly area: AreaEvaluada;
    readonly competencia: string | null;
    readonly enunciado: string;
    readonly correcta: number;
    readonly porcentajeAcierto: number;
    readonly distribucion: readonly number[];
    readonly sinResponder: number;
  }[];
  readonly estudiantes: readonly {
    readonly estudianteId: string;
    readonly nombreCompleto: string;
    readonly grado: number;
    readonly grupo: string | null;
    readonly aciertos: number;
    readonly total: number;
    readonly porcentaje: number;
    readonly global: number | null;
    readonly porArea: readonly PuntajeArea[];
    readonly entregadoEn: string | null;
  }[];
}

// ---------- Campus ----------

export interface SimulacroCampus {
  readonly id: string;
  readonly titulo: string;
  readonly tipo: TipoPrueba;
  readonly grados: readonly number[];
  readonly inicio: string;
  readonly fin: string;
  readonly duracionMinutos: number;
  readonly estado: EstadoSimulacro;
  readonly totalPreguntas: number;
  readonly intento: EstadoIntento | null;
  readonly porcentaje: number | null;
  readonly global: number | null;
  /** Para docentes: cuántos lo han entregado. */
  readonly presentados: number | null;
  /** Estudiante de la fila (un acudiente ve una fila por cada hijo). */
  readonly estudianteId: string | null;
  readonly estudianteNombre: string | null;
}

export interface PreguntaPresentacion {
  readonly id: string;
  readonly orden: number;
  readonly area: AreaEvaluada;
  readonly competencia: string | null;
  readonly contexto: string | null;
  readonly enunciado: string;
  readonly imagenUrl: string | null;
  readonly opciones: readonly string[];
}

export interface Presentacion {
  readonly id: string;
  readonly titulo: string;
  readonly instrucciones: string | null;
  readonly tipo: TipoPrueba;
  readonly limiteEn: string;
  /** Hora del servidor, para corregir el reloj del equipo. */
  readonly ahora: string;
  readonly preguntas: readonly PreguntaPresentacion[];
  readonly respuestas: Readonly<Record<string, number>>;
}

export interface ResultadoIntento {
  readonly simulacroId: string;
  readonly titulo: string;
  readonly tipo: TipoPrueba;
  readonly aciertos: number;
  readonly total: number;
  readonly porcentaje: number;
  readonly global: number | null;
  readonly porArea: readonly PuntajeArea[];
  readonly porCompetencia: readonly {
    readonly area: AreaEvaluada;
    readonly competencia: string;
    readonly aciertos: number;
    readonly total: number;
    readonly porcentaje: number;
  }[];
  readonly entregadoEn: string | null;
  readonly revision: readonly {
    readonly preguntaId: string;
    readonly orden: number;
    readonly area: AreaEvaluada;
    readonly contexto: string | null;
    readonly enunciado: string;
    readonly imagenUrl: string | null;
    readonly opciones: readonly string[];
    readonly elegida: number | null;
    readonly correcta: number;
    readonly explicacion: string | null;
  }[] | null;
  readonly mensajeRevision: string | null;
}

/**
 * Lee preguntas pegadas como texto. Formato (una línea en blanco entre preguntas):
 *
 *   [Matemáticas] ¿Cuánto es 2 + 2?
 *   A) 3
 *   *B) 4        ← el asterisco marca la correcta
 *   C) 5
 *   D) 6
 *   Explicación: Suma básica.
 *
 * El área entre corchetes es opcional (si falta, se usa la indicada). Devuelve también los errores por pregunta.
 */
export function leerPreguntas(
  texto: string,
  areaPorDefecto: AreaEvaluada,
): { preguntas: GuardarPregunta[]; errores: string[] } {
  const preguntas: GuardarPregunta[] = [];
  const errores: string[] = [];
  const bloques = texto
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  bloques.forEach((bloque, i) => {
    const lineas = bloque.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const enunciado: string[] = [];
    const opciones: string[] = [];
    let correcta = -1;
    let explicacion: string | null = null;
    let area = areaPorDefecto;

    for (const linea of lineas) {
      const opcion = /^(\*)?\s*([A-Ea-e])[).:-]\s*(.+)$/.exec(linea);
      if (opcion) {
        if (opcion[1]) {
          correcta = opciones.length;
        }
        opciones.push(opcion[3].trim());
        continue;
      }
      const exp = /^explicaci[oó]n\s*:\s*(.+)$/i.exec(linea);
      if (exp) {
        explicacion = exp[1].trim();
        continue;
      }
      if (opciones.length === 0) {
        const conArea = /^\[([^\]]+)\]\s*(.*)$/.exec(linea);
        if (conArea && enunciado.length === 0) {
          area = areaDesdeTexto(conArea[1]) ?? areaPorDefecto;
          if (conArea[2]) {
            enunciado.push(conArea[2]);
          }
        } else {
          enunciado.push(linea.replace(/^\d+[).]\s*/, ''));
        }
      }
    }

    if (enunciado.length === 0 || opciones.length < 2) {
      errores.push(`Pregunta ${i + 1}: necesita enunciado y al menos dos opciones (A), B)...).`);
    } else if (correcta < 0) {
      errores.push(`Pregunta ${i + 1}: marque la opción correcta con un asterisco, p. ej. *B) ...`);
    } else {
      preguntas.push({
        id: null,
        area,
        competencia: null,
        contexto: null,
        enunciado: enunciado.join('\n'),
        imagenUrl: null,
        opciones,
        correcta,
        explicacion,
      });
    }
  });

  return { preguntas, errores };
}

function areaDesdeTexto(texto: string): AreaEvaluada | null {
  const limpio = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const entrada = (Object.entries(AREAS) as [AreaEvaluada, string][]).find(([, nombre]) =>
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .startsWith(limpio.slice(0, 5)),
  );
  return entrada?.[0] ?? null;
}

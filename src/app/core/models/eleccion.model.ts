/** Cargos que se eligen por voto de los estudiantes (CargoEleccion en la API). */
export type CargoEleccion = 'Personero' | 'Contralor' | 'VoceroGrado' | 'RepresentanteCurso';

export type EstadoEleccion = 'Programada' | 'Abierta' | 'Cerrada';

export interface InfoCargo {
  readonly cargo: CargoEleccion;
  readonly nombre: string;
  readonly quienes: string;
  readonly votan: string;
  readonly icono: string;
}

/** Reglas de cada cargo, como las aplica la API (Ley 115 de 1994 y Decreto 1075 de 2015). */
export const CARGOS: readonly InfoCargo[] = [
  {
    cargo: 'Personero',
    nombre: 'Personero(a) estudiantil',
    quienes: 'Estudiantes de 11°',
    votan: 'Todos los estudiantes',
    icono: 'gavel',
  },
  {
    cargo: 'Contralor',
    nombre: 'Contralor(a) estudiantil',
    quienes: 'Estudiantes de 10° u 11°',
    votan: 'Todos los estudiantes',
    icono: 'account_balance',
  },
  {
    cargo: 'VoceroGrado',
    nombre: 'Vocero(a) de grado al Consejo de Estudiantes',
    quienes: 'Uno por grado; de transición a 3° uno solo, entre los de 3°',
    votan: 'Los estudiantes del mismo grado',
    icono: 'record_voice_over',
  },
  {
    cargo: 'RepresentanteCurso',
    nombre: 'Representante de curso',
    quienes: 'Uno por curso (grado y grupo)',
    votan: 'Los estudiantes del mismo curso',
    icono: 'groups',
  },
];

export function infoCargo(cargo: CargoEleccion): InfoCargo {
  return CARGOS.find((c) => c.cargo === cargo)!;
}

export const ESTADOS_ELECCION: Readonly<Record<EstadoEleccion, string>> = {
  Programada: 'Programada',
  Abierta: 'Votación abierta',
  Cerrada: 'Cerrada',
};

export interface Eleccion {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: EstadoEleccion;
  readonly cargos: readonly CargoEleccion[];
  readonly totalCandidatos: number;
  readonly totalVotantes: number;
}

export interface GuardarEleccion {
  nombre: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  cargos: CargoEleccion[];
}

export interface Candidato {
  readonly id: string;
  readonly eleccionId: string;
  readonly cargo: CargoEleccion;
  readonly estudianteId: string;
  readonly nombreCompleto: string;
  readonly grado: number;
  readonly grupo: string | null;
  readonly ambito: string;
  readonly nombreAmbito: string;
  readonly numero: number;
  readonly lema: string | null;
  readonly propuestas: string | null;
  readonly fotoUrl: string | null;
}

export interface CrearCandidato {
  cargo: CargoEleccion;
  estudianteId: string;
  numero: number | null;
  lema: string | null;
  propuestas: string | null;
  fotoUrl: string | null;
}

export interface ActualizarCandidato {
  numero: number;
  lema: string | null;
  propuestas: string | null;
  fotoUrl: string | null;
}

export interface Aspirante {
  readonly id: string;
  readonly documento: string;
  readonly nombreCompleto: string;
  readonly grado: number;
  readonly grupo: string | null;
}

// ---------- Resultados ----------

export interface ResultadoCandidato {
  readonly candidatoId: string;
  readonly nombreCompleto: string;
  readonly numero: number;
  readonly fotoUrl: string | null;
  readonly votos: number;
}

export interface ContiendaResultado {
  readonly cargo: CargoEleccion;
  readonly nombreCargo: string;
  readonly ambito: string;
  readonly nombreAmbito: string;
  readonly candidatos: readonly ResultadoCandidato[];
  readonly votosEnBlanco: number;
  readonly totalVotos: number;
  readonly ganadorId: string | null;
  readonly empate: boolean;
  readonly ganaVotoEnBlanco: boolean;
}

export interface ParticipacionGrado {
  readonly grado: number;
  readonly nombreGrado: string;
  readonly habilitados: number;
  readonly votantes: number;
}

export interface Resultados {
  readonly eleccionId: string;
  readonly nombre: string;
  readonly estado: EstadoEleccion;
  readonly conteoDisponible: boolean;
  readonly contiendas: readonly ContiendaResultado[];
  readonly participacion: {
    readonly habilitados: number;
    readonly votantes: number;
    readonly porGrado: readonly ParticipacionGrado[];
  };
}

// ---------- Campus ----------

export interface EleccionCampus {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly inicio: string;
  readonly fin: string;
  readonly estado: EstadoEleccion;
  readonly cargos: readonly CargoEleccion[];
  /** Null para docentes. */
  readonly yaVoto: boolean | null;
}

export interface ContiendaTarjeton {
  readonly cargo: CargoEleccion;
  readonly nombreCargo: string;
  readonly ambito: string;
  readonly nombreAmbito: string;
  readonly candidatos: readonly Candidato[];
}

export interface Tarjeton {
  readonly eleccionId: string;
  readonly nombre: string;
  readonly estado: EstadoEleccion;
  readonly inicio: string;
  readonly fin: string;
  readonly puedeVotar: boolean;
  readonly yaVoto: boolean | null;
  readonly contiendas: readonly ContiendaTarjeton[];
}

/** Un voto por cargo; candidatoId null es voto en blanco. */
export interface VotoCargo {
  cargo: CargoEleccion;
  candidatoId: string | null;
}

/** Porcentaje entero para mostrar, sin dividir por cero. */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/** Iniciales para el avatar de un candidato sin foto: "Ana María Pérez" → "AP". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

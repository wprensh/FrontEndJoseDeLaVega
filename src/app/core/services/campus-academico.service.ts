import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  Anotacion,
  Avisos,
  Boletin,
  BoletinesDisponibles,
  CrearAnotacion,
  MisCursos,
  NotaEstudiante,
  Novedad,
  Observador,
  PersonaResumen,
  PlanillaAsistencia,
  PlanillaNotas,
  RegistroAsistencia,
  ResumenAsistencia,
} from '../models/academico.model';
import { CircularCampus, Evento } from '../models/comunicaciones.model';
import { Presentacion, ResultadoIntento, ResultadosSimulacro, SimulacroCampus } from '../models/simulacro.model';
import { URL_CAMPUS } from './campus.service';

/**
 * Plataforma académica dentro del campus: boletines, asistencia, observador, simulacros, circulares,
 * calendario y avisos (estudiantes y acudientes), y la planilla del docente.
 */
@Injectable({ providedIn: 'root' })
export class CampusAcademicoService {
  readonly #http = inject(HttpClient);
  readonly #noLeidos = signal(0);

  /** Avisos sin leer, para la campana del campus. */
  readonly noLeidos = this.#noLeidos.asReadonly();

  // ---- Avisos ----

  async avisos(): Promise<Avisos> {
    const avisos = await firstValueFrom(this.#http.get<Avisos>(`${URL_CAMPUS}/avisos`));
    this.#noLeidos.set(avisos.noLeidos);
    return avisos;
  }

  /** Sin ids marca todos como leídos. */
  async marcarLeidos(ids?: string[]): Promise<void> {
    await firstValueFrom(this.#http.post<void>(`${URL_CAMPUS}/avisos/leidos`, { ids: ids ?? null }));
    this.#noLeidos.update((n) => (ids ? Math.max(0, n - ids.length) : 0));
  }

  // ---- Boletines, asistencia y observador ----

  boletinesDisponibles(): Promise<BoletinesDisponibles> {
    return firstValueFrom(this.#http.get<BoletinesDisponibles>(`${URL_CAMPUS}/boletines`));
  }

  boletin(estudianteId: string, periodoId: string): Promise<Boletin> {
    return firstValueFrom(this.#http.get<Boletin>(`${URL_CAMPUS}/boletines/${estudianteId}/${periodoId}`));
  }

  asistencia(estudianteId: string): Promise<ResumenAsistencia> {
    return firstValueFrom(this.#http.get<ResumenAsistencia>(`${URL_CAMPUS}/asistencia/${estudianteId}`));
  }

  observador(estudianteId: string): Promise<Observador> {
    return firstValueFrom(this.#http.get<Observador>(`${URL_CAMPUS}/observador/${estudianteId}`));
  }

  enterado(anotacionId: string): Promise<Anotacion> {
    return firstValueFrom(this.#http.post<Anotacion>(`${URL_CAMPUS}/observador/${anotacionId}/enterado`, {}));
  }

  // ---- Simulacros ----

  simulacros(): Promise<SimulacroCampus[]> {
    return firstValueFrom(this.#http.get<SimulacroCampus[]>(`${URL_CAMPUS}/simulacros`));
  }

  iniciarSimulacro(id: string): Promise<Presentacion> {
    return firstValueFrom(this.#http.post<Presentacion>(`${URL_CAMPUS}/simulacros/${id}/iniciar`, {}));
  }

  responder(id: string, preguntaId: string, opcion: number | null): Promise<void> {
    return firstValueFrom(this.#http.put<void>(`${URL_CAMPUS}/simulacros/${id}/respuestas`, { preguntaId, opcion }));
  }

  entregar(id: string): Promise<ResultadoIntento> {
    return firstValueFrom(this.#http.post<ResultadoIntento>(`${URL_CAMPUS}/simulacros/${id}/entregar`, {}));
  }

  resultadoSimulacro(id: string, estudianteId?: string): Promise<ResultadoIntento> {
    const params = estudianteId ? new HttpParams().set('estudianteId', estudianteId) : undefined;
    return firstValueFrom(this.#http.get<ResultadoIntento>(`${URL_CAMPUS}/simulacros/${id}/resultado`, { params }));
  }

  /** Para docentes: resultados de sus cursos. */
  resultadosSimulacro(id: string): Promise<ResultadosSimulacro> {
    return firstValueFrom(this.#http.get<ResultadosSimulacro>(`${URL_CAMPUS}/simulacros/${id}/resultados`));
  }

  // ---- Circulares y calendario ----

  circulares(): Promise<CircularCampus[]> {
    return firstValueFrom(this.#http.get<CircularCampus[]>(`${URL_CAMPUS}/circulares`));
  }

  leerCircular(id: string, confirmar: boolean): Promise<CircularCampus> {
    const params = new HttpParams().set('confirmar', confirmar);
    return firstValueFrom(this.#http.post<CircularCampus>(`${URL_CAMPUS}/circulares/${id}/lectura`, {}, { params }));
  }

  calendario(desde?: string, hasta?: string): Promise<Evento[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return firstValueFrom(this.#http.get<Evento[]>(`${URL_CAMPUS}/calendario`, { params }));
  }

  // ---- Docente ----

  misCursos(): Promise<MisCursos> {
    return firstValueFrom(this.#http.get<MisCursos>(`${URL_CAMPUS}/docente/cursos`));
  }

  estudiantesDeClase(asignacionId: string): Promise<PersonaResumen[]> {
    return firstValueFrom(this.#http.get<PersonaResumen[]>(`${URL_CAMPUS}/docente/clases/${asignacionId}/estudiantes`));
  }

  planillaNotas(asignacionId: string, periodoId: string): Promise<PlanillaNotas> {
    return firstValueFrom(this.#http.get<PlanillaNotas>(`${URL_CAMPUS}/docente/clases/${asignacionId}/notas/${periodoId}`));
  }

  guardarNotas(asignacionId: string, periodoId: string, notas: NotaEstudiante[]): Promise<PlanillaNotas> {
    return firstValueFrom(
      this.#http.put<PlanillaNotas>(`${URL_CAMPUS}/docente/clases/${asignacionId}/notas/${periodoId}`, { notas }),
    );
  }

  planillaAsistencia(asignacionId: string, fecha: string): Promise<PlanillaAsistencia> {
    const params = new HttpParams().set('fecha', fecha);
    return firstValueFrom(
      this.#http.get<PlanillaAsistencia>(`${URL_CAMPUS}/docente/clases/${asignacionId}/asistencia`, { params }),
    );
  }

  registrarAsistencia(asignacionId: string, fecha: string, novedades: Novedad[]): Promise<RegistroAsistencia> {
    return firstValueFrom(
      this.#http.put<RegistroAsistencia>(`${URL_CAMPUS}/docente/clases/${asignacionId}/asistencia`, { fecha, novedades }),
    );
  }

  crearAnotacion(datos: CrearAnotacion): Promise<Anotacion> {
    return firstValueFrom(this.#http.post<Anotacion>(`${URL_CAMPUS}/docente/anotaciones`, datos));
  }
}

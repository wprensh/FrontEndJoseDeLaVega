import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import {
  Anotacion,
  Asignacion,
  Asignatura,
  Boletin,
  Consolidado,
  CrearAnotacion,
  CrearAsignacion,
  Curso,
  EstadoCaso,
  GuardarAsignatura,
  GuardarPeriodo,
  Observador,
  Periodo,
  PersonaResumen,
  ReporteAsistencia,
  TipoAnotacion,
} from '../models/academico.model';
import { Tablero } from '../models/comunicaciones.model';
import { BloqueHorario, GuardarBloque, Horario } from '../models/horario.model';

/** Convierte un objeto de filtros en parámetros de consulta, omitiendo los vacíos. */
export function parametros(filtro: object): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

export interface FiltroAnotaciones {
  tipo?: TipoAnotacion | null;
  estado?: EstadoCaso | null;
  grado?: number | null;
  grupo?: string | null;
  buscar?: string | null;
  soloSituaciones?: boolean;
  pagina?: number;
  tamanoPagina?: number;
}

/** Módulos Académico, Convivencia e Indicadores del panel administrativo. */
@Injectable({ providedIn: 'root' })
export class AcademicoAdminService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/academico`;
  readonly #urlConvivencia = `${environment.apiBaseUrl}/convivencia`;

  // ---- Asignaturas ----

  asignaturas(): Promise<Asignatura[]> {
    return firstValueFrom(this.#http.get<Asignatura[]>(`${this.#url}/asignaturas`));
  }

  guardarAsignatura(id: string | null, datos: GuardarAsignatura): Promise<Asignatura> {
    return firstValueFrom(
      id
        ? this.#http.put<Asignatura>(`${this.#url}/asignaturas/${id}`, datos)
        : this.#http.post<Asignatura>(`${this.#url}/asignaturas`, datos),
    );
  }

  eliminarAsignatura(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/asignaturas/${id}`));
  }

  // ---- Periodos ----

  periodos(anio?: number): Promise<Periodo[]> {
    return firstValueFrom(this.#http.get<Periodo[]>(`${this.#url}/periodos`, { params: parametros({ anio }) }));
  }

  guardarPeriodo(id: string | null, datos: GuardarPeriodo): Promise<Periodo> {
    return firstValueFrom(
      id
        ? this.#http.put<Periodo>(`${this.#url}/periodos/${id}`, datos)
        : this.#http.post<Periodo>(`${this.#url}/periodos`, datos),
    );
  }

  eliminarPeriodo(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/periodos/${id}`));
  }

  // ---- Asignación docente ----

  asignaciones(anio: number, filtro: { docenteId?: string; grado?: number; grupo?: string } = {}): Promise<Asignacion[]> {
    return firstValueFrom(
      this.#http.get<Asignacion[]>(`${this.#url}/asignaciones`, { params: parametros({ anio, ...filtro }) }),
    );
  }

  crearAsignacion(datos: CrearAsignacion): Promise<Asignacion> {
    return firstValueFrom(this.#http.post<Asignacion>(`${this.#url}/asignaciones`, datos));
  }

  actualizarAsignacion(id: string, docenteId: string, intensidadHoraria: number | null): Promise<Asignacion> {
    return firstValueFrom(this.#http.put<Asignacion>(`${this.#url}/asignaciones/${id}`, { docenteId, intensidadHoraria }));
  }

  eliminarAsignacion(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/asignaciones/${id}`));
  }

  cursos(): Promise<Curso[]> {
    return firstValueFrom(this.#http.get<Curso[]>(`${this.#url}/cursos`));
  }

  docentes(): Promise<PersonaResumen[]> {
    return firstValueFrom(this.#http.get<PersonaResumen[]>(`${this.#url}/docentes`));
  }

  // ---- Horario semanal ----

  horario(anio: number, filtro: { docenteId?: string; grado?: number; grupo?: string | null }): Promise<Horario> {
    return firstValueFrom(this.#http.get<Horario>(`${this.#url}/horario`, { params: parametros({ anio, ...filtro }) }));
  }

  crearBloque(datos: GuardarBloque): Promise<BloqueHorario> {
    return firstValueFrom(this.#http.post<BloqueHorario>(`${this.#url}/horario`, datos));
  }

  moverBloque(id: string, datos: Omit<GuardarBloque, 'asignacionId'>): Promise<BloqueHorario> {
    return firstValueFrom(this.#http.put<BloqueHorario>(`${this.#url}/horario/${id}`, datos));
  }

  eliminarBloque(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/horario/${id}`));
  }

  // ---- Reportes ----

  consolidado(periodoId: string, grado: number, grupo: string | null): Promise<Consolidado> {
    return firstValueFrom(
      this.#http.get<Consolidado>(`${this.#url}/consolidado`, { params: parametros({ periodoId, grado, grupo }) }),
    );
  }

  boletinesCurso(periodoId: string, grado: number, grupo: string | null): Promise<Boletin[]> {
    return firstValueFrom(
      this.#http.get<Boletin[]>(`${this.#url}/boletines`, { params: parametros({ periodoId, grado, grupo }) }),
    );
  }

  reporteAsistencia(grado: number, grupo: string | null, desde?: string, hasta?: string): Promise<ReporteAsistencia> {
    return firstValueFrom(
      this.#http.get<ReporteAsistencia>(`${this.#url}/asistencia`, { params: parametros({ grado, grupo, desde, hasta }) }),
    );
  }

  // ---- Convivencia ----

  anotaciones(filtro: FiltroAnotaciones): Promise<PagedResult<Anotacion>> {
    return firstValueFrom(
      this.#http.get<PagedResult<Anotacion>>(this.#urlConvivencia, { params: parametros(filtro) }),
    );
  }

  anotacion(id: string): Promise<Anotacion> {
    return firstValueFrom(this.#http.get<Anotacion>(`${this.#urlConvivencia}/${id}`));
  }

  buscarEstudiantes(buscar: string): Promise<PersonaResumen[]> {
    return firstValueFrom(
      this.#http.get<PersonaResumen[]>(`${this.#urlConvivencia}/estudiantes`, { params: parametros({ buscar }) }),
    );
  }

  observador(estudianteId: string): Promise<Observador> {
    return firstValueFrom(this.#http.get<Observador>(`${this.#urlConvivencia}/estudiantes/${estudianteId}/observador`));
  }

  crearAnotacion(datos: CrearAnotacion): Promise<Anotacion> {
    return firstValueFrom(this.#http.post<Anotacion>(this.#urlConvivencia, datos));
  }

  seguimiento(id: string, texto: string, estado: EstadoCaso | null): Promise<Anotacion> {
    return firstValueFrom(this.#http.post<Anotacion>(`${this.#urlConvivencia}/${id}/seguimientos`, { texto, estado }));
  }

  // ---- Tablero del rector ----

  tablero(): Promise<Tablero> {
    return firstValueFrom(this.#http.get<Tablero>(`${environment.apiBaseUrl}/indicadores`));
  }
}

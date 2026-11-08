import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GuardarPregunta,
  GuardarSimulacro,
  ResultadosSimulacro,
  Simulacro,
  SimulacroDetalle,
} from '../models/simulacro.model';

/** Módulo Simulacros del panel: pruebas, banco de preguntas y resultados. */
@Injectable({ providedIn: 'root' })
export class SimulacrosService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/simulacros`;

  listar(): Promise<Simulacro[]> {
    return firstValueFrom(this.#http.get<Simulacro[]>(this.#url));
  }

  obtener(id: string): Promise<SimulacroDetalle> {
    return firstValueFrom(this.#http.get<SimulacroDetalle>(`${this.#url}/${id}`));
  }

  guardar(id: string | null, datos: GuardarSimulacro): Promise<Simulacro> {
    return firstValueFrom(
      id ? this.#http.put<Simulacro>(`${this.#url}/${id}`, datos) : this.#http.post<Simulacro>(this.#url, datos),
    );
  }

  eliminar(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}`));
  }

  guardarPreguntas(id: string, preguntas: GuardarPregunta[]): Promise<SimulacroDetalle> {
    return firstValueFrom(this.#http.put<SimulacroDetalle>(`${this.#url}/${id}/preguntas`, { preguntas }));
  }

  resultados(id: string): Promise<ResultadosSimulacro> {
    return firstValueFrom(this.#http.get<ResultadosSimulacro>(`${this.#url}/${id}/resultados`));
  }
}

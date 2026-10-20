import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ActualizarCandidato,
  Aspirante,
  Candidato,
  CargoEleccion,
  CrearCandidato,
  Eleccion,
  GuardarEleccion,
  Resultados,
} from '../models/eleccion.model';

/** Elecciones escolares desde el panel: jornadas, candidatos y resultados. */
@Injectable({ providedIn: 'root' })
export class EleccionesService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/elecciones`;

  listar(): Promise<Eleccion[]> {
    return firstValueFrom(this.#http.get<Eleccion[]>(this.#url));
  }

  obtener(id: string): Promise<Eleccion> {
    return firstValueFrom(this.#http.get<Eleccion>(`${this.#url}/${id}`));
  }

  crear(datos: GuardarEleccion): Promise<Eleccion> {
    return firstValueFrom(this.#http.post<Eleccion>(this.#url, datos));
  }

  actualizar(id: string, datos: GuardarEleccion): Promise<Eleccion> {
    return firstValueFrom(this.#http.put<Eleccion>(`${this.#url}/${id}`, datos));
  }

  eliminar(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}`));
  }

  candidatos(id: string): Promise<Candidato[]> {
    return firstValueFrom(this.#http.get<Candidato[]>(`${this.#url}/${id}/candidatos`));
  }

  aspirantes(id: string, cargo: CargoEleccion, buscar: string): Promise<Aspirante[]> {
    return firstValueFrom(
      this.#http.get<Aspirante[]>(`${this.#url}/${id}/aspirantes`, { params: { cargo, buscar } }),
    );
  }

  crearCandidato(id: string, datos: CrearCandidato): Promise<Candidato> {
    return firstValueFrom(this.#http.post<Candidato>(`${this.#url}/${id}/candidatos`, datos));
  }

  actualizarCandidato(id: string, candidatoId: string, datos: ActualizarCandidato): Promise<Candidato> {
    return firstValueFrom(this.#http.put<Candidato>(`${this.#url}/${id}/candidatos/${candidatoId}`, datos));
  }

  eliminarCandidato(id: string, candidatoId: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}/candidatos/${candidatoId}`));
  }

  resultados(id: string): Promise<Resultados> {
    return firstValueFrom(this.#http.get<Resultados>(`${this.#url}/${id}/resultados`));
  }
}

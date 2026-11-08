import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import {
  AdmisionRadicada,
  CambiarEstadoAdmision,
  Circular,
  DocumentoAdmision,
  EstadoAdmision,
  EstadoAdmisionConsulta,
  Evento,
  GuardarCircular,
  GuardarEvento,
  Matricula,
  PendienteCircular,
  RadicarAdmision,
  SolicitudAdmision,
  TipoDocumentoAdmision,
} from '../models/comunicaciones.model';
import { parametros } from './academico-admin.service';

export interface FiltroAdmisiones {
  estado?: EstadoAdmision | null;
  anioLectivo?: number | null;
  grado?: number | null;
  buscar?: string | null;
  pagina?: number;
  tamanoPagina?: number;
}

/** Circulares, calendario escolar y admisiones (pre-matrícula pública y revisión en el panel). */
@Injectable({ providedIn: 'root' })
export class ComunicacionesService {
  readonly #http = inject(HttpClient);
  readonly #api = environment.apiBaseUrl;

  // ---- Circulares ----

  circulares(): Promise<Circular[]> {
    return firstValueFrom(this.#http.get<Circular[]>(`${this.#api}/circulares`));
  }

  guardarCircular(id: string | null, datos: GuardarCircular): Promise<Circular> {
    return firstValueFrom(
      id
        ? this.#http.put<Circular>(`${this.#api}/circulares/${id}`, datos)
        : this.#http.post<Circular>(`${this.#api}/circulares`, datos),
    );
  }

  publicarCircular(id: string): Promise<Circular> {
    return firstValueFrom(this.#http.post<Circular>(`${this.#api}/circulares/${id}/publicacion`, {}));
  }

  eliminarCircular(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#api}/circulares/${id}`));
  }

  pendientes(id: string): Promise<PendienteCircular[]> {
    return firstValueFrom(this.#http.get<PendienteCircular[]>(`${this.#api}/circulares/${id}/pendientes`));
  }

  // ---- Calendario ----

  /** Eventos públicos (sin sesión). */
  calendarioPublico(desde?: string, hasta?: string): Promise<Evento[]> {
    return firstValueFrom(this.#http.get<Evento[]>(`${this.#api}/calendario`, { params: parametros({ desde, hasta }) }));
  }

  /** Todos los eventos, para administrarlos. */
  eventos(desde: string, hasta: string): Promise<Evento[]> {
    return firstValueFrom(
      this.#http.get<Evento[]>(`${this.#api}/calendario/eventos`, { params: parametros({ desde, hasta }) }),
    );
  }

  guardarEvento(id: string | null, datos: GuardarEvento): Promise<Evento> {
    return firstValueFrom(
      id
        ? this.#http.put<Evento>(`${this.#api}/calendario/eventos/${id}`, datos)
        : this.#http.post<Evento>(`${this.#api}/calendario/eventos`, datos),
    );
  }

  eliminarEvento(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#api}/calendario/eventos/${id}`));
  }

  // ---- Admisiones: familias ----

  radicar(datos: RadicarAdmision): Promise<AdmisionRadicada> {
    return firstValueFrom(this.#http.post<AdmisionRadicada>(`${this.#api}/admisiones`, datos));
  }

  consultarAdmision(radicado: string, documento: string): Promise<EstadoAdmisionConsulta> {
    return firstValueFrom(
      this.#http.get<EstadoAdmisionConsulta>(`${this.#api}/admisiones/estado`, { params: parametros({ radicado, documento }) }),
    );
  }

  subirDocumento(radicado: string, documento: string, tipo: TipoDocumentoAdmision, archivo: File): Promise<DocumentoAdmision> {
    const formulario = new FormData();
    formulario.append('radicado', radicado);
    formulario.append('documento', documento);
    formulario.append('tipo', tipo);
    formulario.append('archivo', archivo, archivo.name);
    return firstValueFrom(this.#http.post<DocumentoAdmision>(`${this.#api}/admisiones/documentos`, formulario));
  }

  // ---- Admisiones: secretaría ----

  admisiones(filtro: FiltroAdmisiones): Promise<PagedResult<SolicitudAdmision>> {
    return firstValueFrom(
      this.#http.get<PagedResult<SolicitudAdmision>>(`${this.#api}/admisiones`, { params: parametros(filtro) }),
    );
  }

  admision(id: string): Promise<SolicitudAdmision> {
    return firstValueFrom(this.#http.get<SolicitudAdmision>(`${this.#api}/admisiones/${id}`));
  }

  descargarDocumento(id: string, documentoId: string): Promise<Blob> {
    return firstValueFrom(
      this.#http.get(`${this.#api}/admisiones/${id}/documentos/${documentoId}`, { responseType: 'blob' }),
    );
  }

  cambiarEstadoAdmision(id: string, datos: CambiarEstadoAdmision): Promise<SolicitudAdmision> {
    return firstValueFrom(this.#http.put<SolicitudAdmision>(`${this.#api}/admisiones/${id}/estado`, datos));
  }

  matricular(id: string, grupo: string | null): Promise<Matricula> {
    return firstValueFrom(this.#http.post<Matricula>(`${this.#api}/admisiones/${id}/matricula`, { grupo }));
  }

  eliminarAdmision(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#api}/admisiones/${id}`));
  }
}

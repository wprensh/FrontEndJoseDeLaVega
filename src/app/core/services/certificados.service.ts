import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult, paginaVacia } from '../models/api.models';
import { Certificado, CertificadoFiltro, ExpedirCertificado, VerificacionCertificado } from '../models/certificado.model';
import { mensajeDeError } from '../utils/http-error';

/** Acceso a /api/certificados con el listado del panel expuesto como Signals (igual que NoticiasService). */
@Injectable({ providedIn: 'root' })
export class CertificadosService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/certificados`;

  readonly #pagina = signal<PagedResult<Certificado>>(paginaVacia<Certificado>());
  readonly #cargando = signal(false);
  readonly #error = signal<string | null>(null);
  /** Evita que una respuesta lenta y antigua sobrescriba a una más reciente. */
  #ultimaSolicitud = 0;

  readonly certificados = computed(() => this.#pagina().items);
  readonly total = computed(() => this.#pagina().total);
  readonly cargando = this.#cargando.asReadonly();
  readonly error = this.#error.asReadonly();

  async cargar(filtro: CertificadoFiltro = {}): Promise<void> {
    const solicitud = ++this.#ultimaSolicitud;
    this.#cargando.set(true);
    this.#error.set(null);

    try {
      const pagina = await firstValueFrom(
        this.#http.get<PagedResult<Certificado>>(this.#url, { params: aParams(filtro) }),
      );
      if (solicitud === this.#ultimaSolicitud) {
        this.#pagina.set(pagina);
      }
    } catch (error) {
      if (solicitud === this.#ultimaSolicitud) {
        this.#error.set(mensajeDeError(error));
      }
    } finally {
      if (solicitud === this.#ultimaSolicitud) {
        this.#cargando.set(false);
      }
    }
  }

  expedir(datos: ExpedirCertificado): Promise<Certificado> {
    return firstValueFrom(this.#http.post<Certificado>(this.#url, datos));
  }

  async anular(id: string, motivo: string): Promise<Certificado> {
    const anulado = await firstValueFrom(this.#http.put<Certificado>(`${this.#url}/${id}/anulacion`, { motivo }));
    this.#pagina.update((p) => ({ ...p, items: p.items.map((c) => (c.id === id ? anulado : c)) }));
    return anulado;
  }

  /** Consulta pública: no requiere la clave de administración. */
  verificar(codigo: string): Promise<VerificacionCertificado> {
    return firstValueFrom(
      this.#http.get<VerificacionCertificado>(`${this.#url}/verificar/${encodeURIComponent(codigo.trim())}`),
    );
  }
}

function aParams(filtro: CertificadoFiltro): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult, paginaVacia } from '../models/api.models';
import { GuardarNoticia, Noticia, NoticiaFiltro } from '../models/noticia.model';
import { mensajeDeError } from '../utils/http-error';

/**
 * Acceso a /api/noticias con estado expuesto como Signals.
 *
 * - `noticias`, `total`, `cargando` y `error` son Signals de solo lectura: los componentes
 *   los leen directamente en la plantilla, sin suscripciones ni `async` pipe.
 * - HttpClient devuelve Observables; se convierten a Promesa con `firstValueFrom` porque cada
 *   petición emite un único valor. Así no hace falta ningún operador de RxJS.
 */
@Injectable({ providedIn: 'root' })
export class NoticiasService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/noticias`;

  // ---- Estado privado (escritura solo dentro del servicio) ----
  readonly #pagina = signal<PagedResult<Noticia>>(paginaVacia<Noticia>());
  readonly #cargando = signal(false);
  readonly #error = signal<string | null>(null);
  /** Evita que una respuesta lenta y antigua sobrescriba a una más reciente. */
  #ultimaSolicitud = 0;

  // ---- Estado público de solo lectura ----
  readonly noticias = computed(() => this.#pagina().items);
  readonly total = computed(() => this.#pagina().total);
  readonly paginaActual = computed(() => this.#pagina().pagina);
  readonly cargando = this.#cargando.asReadonly();
  readonly error = this.#error.asReadonly();

  /** Carga una página del listado y actualiza los Signals del servicio. */
  async cargar(filtro: NoticiaFiltro = {}): Promise<void> {
    const solicitud = ++this.#ultimaSolicitud;
    this.#cargando.set(true);
    this.#error.set(null);

    try {
      const pagina = await this.buscar(filtro);
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

  /** Consulta sin modificar el estado compartido (útil para bloques como "Noticias recientes"). */
  buscar(filtro: NoticiaFiltro = {}): Promise<PagedResult<Noticia>> {
    return firstValueFrom(this.#http.get<PagedResult<Noticia>>(this.#url, { params: aParams(filtro) }));
  }

  crear(datos: GuardarNoticia): Promise<Noticia> {
    return firstValueFrom(this.#http.post<Noticia>(this.#url, datos));
  }

  async actualizar(id: string, datos: GuardarNoticia): Promise<Noticia> {
    const actualizada = await firstValueFrom(this.#http.put<Noticia>(`${this.#url}/${id}`, datos));
    // Actualización local inmediata: la tabla refleja el cambio sin recargar.
    this.#pagina.update((p) => ({ ...p, items: p.items.map((n) => (n.id === id ? actualizada : n)) }));
    return actualizada;
  }

  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}`));
    this.#pagina.update((p) => ({ ...p, items: p.items.filter((n) => n.id !== id), total: p.total - 1 }));
  }
}

function aParams(filtro: NoticiaFiltro): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

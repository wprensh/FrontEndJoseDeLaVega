import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import { ActualizarUsuario, CrearUsuario, Usuario } from '../models/usuario.model';
import { mensajeDeError } from '../utils/http-error';

export interface UsuarioFiltro {
  buscar?: string;
  pagina?: number;
  tamanoPagina?: number;
}

/** Módulo de usuarios del panel. Estado del listado con Signals, como los demás servicios. */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/usuarios`;

  readonly #usuarios = signal<Usuario[]>([]);
  readonly #total = signal(0);
  readonly #cargando = signal(false);
  readonly #error = signal<string | null>(null);

  readonly usuarios = this.#usuarios.asReadonly();
  readonly total = this.#total.asReadonly();
  readonly cargando = this.#cargando.asReadonly();
  readonly error = this.#error.asReadonly();

  async cargar(filtro: UsuarioFiltro = {}): Promise<void> {
    this.#cargando.set(true);
    this.#error.set(null);
    try {
      let params = new HttpParams();
      for (const [clave, valor] of Object.entries(filtro)) {
        if (valor !== undefined && valor !== '') {
          params = params.set(clave, String(valor));
        }
      }
      const pagina = await firstValueFrom(this.#http.get<PagedResult<Usuario>>(this.#url, { params }));
      this.#usuarios.set([...pagina.items]);
      this.#total.set(pagina.total);
    } catch (error) {
      this.#error.set(mensajeDeError(error));
    } finally {
      this.#cargando.set(false);
    }
  }

  async crear(datos: CrearUsuario): Promise<Usuario> {
    const creado = await firstValueFrom(this.#http.post<Usuario>(this.#url, datos));
    this.#total.update((t) => t + 1);
    return creado;
  }

  async actualizar(id: string, datos: ActualizarUsuario): Promise<Usuario> {
    const actualizado = await firstValueFrom(this.#http.put<Usuario>(`${this.#url}/${id}`, datos));
    this.#usuarios.update((lista) => lista.map((u) => (u.id === id ? actualizado : u)));
    return actualizado;
  }

  restablecerClave(id: string, claveNueva: string): Promise<void> {
    return firstValueFrom(this.#http.put<void>(`${this.#url}/${id}/clave`, { claveNueva }));
  }

  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}`));
    this.#usuarios.update((lista) => lista.filter((u) => u.id !== id));
    this.#total.update((t) => Math.max(0, t - 1));
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import {
  ActualizarMiembro,
  ClaveGenerada,
  CrearMiembro,
  FiltroClaves,
  FilaAcudiente,
  FilaImportacion,
  MiembroCampus,
  ResultadoImportacion,
  ResultadoImportacionAcudientes,
  RolCampus,
  VerificacionCarnet,
  Vinculo,
} from '../models/campus.model';
import { mensajeDeError } from '../utils/http-error';

export interface MiembroFiltro {
  buscar?: string;
  rol?: RolCampus;
  grado?: number;
  grupo?: string;
  pagina?: number;
  tamanoPagina?: number;
}

/** Estudiantes y docentes del campus (módulo Comunidad del panel). */
@Injectable({ providedIn: 'root' })
export class ComunidadService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/comunidad`;

  readonly #miembros = signal<MiembroCampus[]>([]);
  readonly #total = signal(0);
  readonly #cargando = signal(false);
  readonly #error = signal<string | null>(null);

  readonly miembros = this.#miembros.asReadonly();
  readonly total = this.#total.asReadonly();
  readonly cargando = this.#cargando.asReadonly();
  readonly error = this.#error.asReadonly();

  async cargar(filtro: MiembroFiltro = {}): Promise<void> {
    this.#cargando.set(true);
    this.#error.set(null);
    try {
      let params = new HttpParams();
      for (const [clave, valor] of Object.entries(filtro)) {
        if (valor !== undefined && valor !== null && valor !== '') {
          params = params.set(clave, String(valor));
        }
      }
      const pagina = await firstValueFrom(this.#http.get<PagedResult<MiembroCampus>>(this.#url, { params }));
      this.#miembros.set([...pagina.items]);
      this.#total.set(pagina.total);
    } catch (error) {
      this.#error.set(mensajeDeError(error));
    } finally {
      this.#cargando.set(false);
    }
  }

  crear(datos: CrearMiembro): Promise<MiembroCampus> {
    return firstValueFrom(this.#http.post<MiembroCampus>(this.#url, datos));
  }

  async actualizar(id: string, datos: ActualizarMiembro): Promise<MiembroCampus> {
    const actualizado = await firstValueFrom(this.#http.put<MiembroCampus>(`${this.#url}/${id}`, datos));
    this.#miembros.update((lista) => lista.map((m) => (m.id === id ? actualizado : m)));
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.#http.delete<void>(`${this.#url}/${id}`));
    this.#miembros.update((lista) => lista.filter((m) => m.id !== id));
    this.#total.update((t) => Math.max(0, t - 1));
  }

  importar(rol: RolCampus, filas: FilaImportacion[]): Promise<ResultadoImportacion> {
    return firstValueFrom(this.#http.post<ResultadoImportacion>(`${this.#url}/importar`, { rol, filas }));
  }

  generarClaves(filtro: FiltroClaves): Promise<ClaveGenerada[]> {
    return firstValueFrom(this.#http.post<ClaveGenerada[]>(`${this.#url}/claves`, filtro));
  }

  // ---- Acudientes ----

  vinculos(miembroId: string): Promise<Vinculo[]> {
    return firstValueFrom(this.#http.get<Vinculo[]>(`${this.#url}/${miembroId}/vinculos`));
  }

  /** Vincula al miembro (estudiante o acudiente) con la persona del documento indicado. */
  vincular(miembroId: string, documento: string, parentesco: string | null): Promise<Vinculo> {
    return firstValueFrom(this.#http.post<Vinculo>(`${this.#url}/${miembroId}/vinculos`, { documento, parentesco }));
  }

  desvincular(miembroId: string, vinculoId: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#url}/${miembroId}/vinculos/${vinculoId}`));
  }

  importarAcudientes(filas: FilaAcudiente[]): Promise<ResultadoImportacionAcudientes> {
    return firstValueFrom(this.#http.post<ResultadoImportacionAcudientes>(`${this.#url}/acudientes/importar`, { filas }));
  }

  /** Miembros activos con los filtros indicados (para imprimir carnés), hasta 200 por página. */
  async todos(filtro: MiembroFiltro): Promise<MiembroCampus[]> {
    const resultado: MiembroCampus[] = [];
    for (let pagina = 1; pagina <= 30; pagina++) {
      const params = Object.entries({ ...filtro, pagina, tamanoPagina: 200 }).reduce(
        (p, [clave, valor]) => (valor === undefined || valor === null || valor === '' ? p : p.set(clave, String(valor))),
        new HttpParams(),
      );
      const pag = await firstValueFrom(this.#http.get<PagedResult<MiembroCampus>>(this.#url, { params }));
      resultado.push(...pag.items);
      if (resultado.length >= pag.total || pag.items.length === 0) {
        break;
      }
    }
    return resultado;
  }

  /** Verificación pública del carné (el QR apunta a /carnet/{codigo}). */
  verificarCarnet(codigo: string): Promise<VerificacionCarnet> {
    return firstValueFrom(
      this.#http.get<VerificacionCarnet>(`${environment.apiBaseUrl}/carnets/${encodeURIComponent(codigo)}`),
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PerfilCampus, SesionCampus } from '../models/campus.model';
import { EleccionCampus, Resultados, Tarjeton, VotoCargo } from '../models/eleccion.model';

const CLAVE_ALMACEN = 'jv-sesion-campus';

/** Prefijo de la API del campus: el interceptor le pone el token del campus, no el del panel. */
export const URL_CAMPUS = `${environment.apiBaseUrl}/campus`;

/**
 * Sesión del campus virtual y votación. En el navegador la sesión vive solo en la pestaña (sessionStorage):
 * en la sala de informática los equipos se comparten, así que nunca queda guardada al cerrar.
 * En la app instalada en el celular (PWA) sí se recuerda hasta que vence, como cualquier app.
 */
@Injectable({ providedIn: 'root' })
export class CampusService {
  readonly #http = inject(HttpClient);
  readonly #sesion = signal<SesionCampus | null>(leer());

  readonly token = computed(() => this.#sesion()?.token ?? null);
  readonly perfil = computed(() => this.#sesion()?.perfil ?? null);
  readonly activa = computed(() => this.#sesion() !== null);
  readonly esEstudiante = computed(() => this.perfil()?.rol === 'Estudiante');

  async iniciarSesion(documento: string, clave: string): Promise<PerfilCampus> {
    const sesion = await firstValueFrom(
      this.#http.post<SesionCampus>(`${URL_CAMPUS}/iniciar-sesion`, { documento, clave }),
    );
    this.#sesion.set(sesion);
    escribir(sesion);
    return sesion.perfil;
  }

  /** Vuelve a leer el perfil (p. ej. si la secretaría vinculó otro hijo al acudiente). */
  async actualizarPerfil(): Promise<void> {
    const actual = this.#sesion();
    if (!actual) {
      return;
    }
    const perfil = await firstValueFrom(this.#http.get<PerfilCampus>(`${URL_CAMPUS}/perfil`));
    if (this.#sesion()?.token === actual.token) {
      const sesion = { ...actual, perfil };
      this.#sesion.set(sesion);
      escribir(sesion);
    }
  }

  cerrar(): void {
    this.#sesion.set(null);
    escribir(null);
  }

  elecciones(): Promise<EleccionCampus[]> {
    return firstValueFrom(this.#http.get<EleccionCampus[]>(`${URL_CAMPUS}/elecciones`));
  }

  tarjeton(id: string): Promise<Tarjeton> {
    return firstValueFrom(this.#http.get<Tarjeton>(`${URL_CAMPUS}/elecciones/${id}/tarjeton`));
  }

  votar(id: string, votos: VotoCargo[]): Promise<void> {
    return firstValueFrom(this.#http.post<void>(`${URL_CAMPUS}/elecciones/${id}/votar`, { votos }));
  }

  resultados(id: string): Promise<Resultados> {
    return firstValueFrom(this.#http.get<Resultados>(`${URL_CAMPUS}/elecciones/${id}/resultados`));
  }
}

/** true cuando el sitio corre como app instalada (pantalla de inicio del celular o del computador). */
export function esAppInstalada(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function almacen(): Storage {
  return esAppInstalada() ? localStorage : sessionStorage;
}

function leer(): SesionCampus | null {
  try {
    const texto = almacen().getItem(CLAVE_ALMACEN);
    const sesion = texto ? (JSON.parse(texto) as SesionCampus) : null;
    return sesion && Date.parse(sesion.expira) > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

function escribir(sesion: SesionCampus | null): void {
  try {
    if (sesion) {
      almacen().setItem(CLAVE_ALMACEN, JSON.stringify(sesion));
    } else {
      sessionStorage.removeItem(CLAVE_ALMACEN);
      localStorage.removeItem(CLAVE_ALMACEN);
    }
  } catch {
    // Sin almacenamiento, la sesión dura hasta recargar la página.
  }
}

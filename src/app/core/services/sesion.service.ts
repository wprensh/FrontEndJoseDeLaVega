import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Accion,
  ConfiguracionInicial,
  EstadoAutenticacion,
  Modulo,
  Perfil,
  Permiso,
  Sesion,
} from '../models/usuario.model';

const CLAVE_ALMACEN = 'jv-sesion-admin';

/** Encabezado de la clave de administración: solo se usa para crear el primer superadministrador. */
export const ENCABEZADO_CLAVE_ADMIN = 'X-Clave-Admin';

/**
 * Sesión del panel administrativo: token, usuario y permisos.
 * Por defecto dura lo que la pestaña abierta (sessionStorage); con "Mantener la sesión iniciada"
 * sobrevive al cierre del navegador (localStorage) hasta que vence el token.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/auth`;
  readonly #sesion = signal<Sesion | null>(leer());

  readonly token = computed(() => this.#sesion()?.token ?? null);
  readonly usuario = computed(() => this.#sesion()?.usuario ?? null);
  readonly activa = computed(() => this.#sesion() !== null);

  readonly #permisos = computed(() => new Set<Permiso>(this.usuario()?.permisos ?? []));

  /** ¿Puede el usuario de la sesión hacer `accion` en `modulo`? Solo oculta botones: la API vuelve a validarlo. */
  puede(modulo: Modulo, accion: Accion = 'Ver'): boolean {
    return this.#permisos().has(`${modulo}:${accion}`);
  }

  estado(): Promise<EstadoAutenticacion> {
    return firstValueFrom(this.#http.get<EstadoAutenticacion>(`${this.#url}/estado`));
  }

  async iniciarSesion(usuario: string, clave: string, recordar: boolean): Promise<Perfil> {
    const sesion = await firstValueFrom(this.#http.post<Sesion>(`${this.#url}/iniciar-sesion`, { usuario, clave }));
    this.#guardar(sesion, recordar);
    return sesion.usuario;
  }

  async configurar(datos: ConfiguracionInicial, claveAdministracion: string): Promise<Perfil> {
    const sesion = await firstValueFrom(
      this.#http.post<Sesion>(`${this.#url}/configuracion-inicial`, datos, {
        headers: { [ENCABEZADO_CLAVE_ADMIN]: claveAdministracion.trim() },
      }),
    );
    this.#guardar(sesion, false);
    return sesion.usuario;
  }

  /** Vuelve a leer los permisos (por si un administrador los cambió durante la sesión). */
  async actualizarPerfil(): Promise<void> {
    const sesion = this.#sesion();
    if (!sesion) {
      return;
    }
    const usuario = await firstValueFrom(this.#http.get<Perfil>(`${this.#url}/perfil`));
    this.#guardar({ ...sesion, usuario }, recordada());
  }

  /** Cambiar la clave cierra las demás sesiones; esta recibe un token nuevo. */
  async cambiarClave(claveActual: string, claveNueva: string): Promise<void> {
    const sesion = await firstValueFrom(
      this.#http.put<Sesion>(`${this.#url}/perfil/clave`, { claveActual, claveNueva }),
    );
    this.#guardar(sesion, recordada());
  }

  cerrar(): void {
    this.#sesion.set(null);
    escribir(null, false);
  }

  #guardar(sesion: Sesion, recordar: boolean): void {
    this.#sesion.set(sesion);
    escribir(sesion, recordar);
  }
}

// El almacenamiento puede no estar disponible (modo privado, bloqueo de cookies): se ignora el error.
function leer(): Sesion | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_ALMACEN) ?? localStorage.getItem(CLAVE_ALMACEN);
    const sesion = texto ? (JSON.parse(texto) as Sesion) : null;
    // Un token vencido no sirve: se descarta para mostrar el inicio de sesión de una vez.
    return sesion && Date.parse(sesion.expira) > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

function recordada(): boolean {
  try {
    return localStorage.getItem(CLAVE_ALMACEN) !== null;
  } catch {
    return false;
  }
}

function escribir(sesion: Sesion | null, recordar: boolean): void {
  try {
    sessionStorage.removeItem(CLAVE_ALMACEN);
    localStorage.removeItem(CLAVE_ALMACEN);
    if (sesion) {
      (recordar ? localStorage : sessionStorage).setItem(CLAVE_ALMACEN, JSON.stringify(sesion));
    }
  } catch {
    // Sin almacenamiento, la sesión dura hasta recargar la página.
  }
}

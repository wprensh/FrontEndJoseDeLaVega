import { Injectable, computed, signal } from '@angular/core';

const CLAVE_ALMACEN = 'jv-clave-admin';

/**
 * Clave de administración del panel de noticias.
 * Se guarda solo durante la pestaña abierta (sessionStorage): al cerrar el navegador hay que volver a escribirla.
 * Es una protección mínima mientras se implementa el inicio de sesión por usuario.
 */
@Injectable({ providedIn: 'root' })
export class SesionAdminService {
  readonly #clave = signal<string | null>(leer());

  readonly clave = this.#clave.asReadonly();
  readonly activa = computed(() => !!this.#clave());

  iniciar(clave: string): void {
    const limpia = clave.trim();
    this.#clave.set(limpia || null);
    escribir(limpia || null);
  }

  cerrar(): void {
    this.#clave.set(null);
    escribir(null);
  }
}

// El almacenamiento puede no estar disponible (modo privado, bloqueo de cookies): se ignora el error.
function leer(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_ALMACEN);
  } catch {
    return null;
  }
}

function escribir(valor: string | null): void {
  try {
    if (valor) {
      sessionStorage.setItem(CLAVE_ALMACEN, valor);
    } else {
      sessionStorage.removeItem(CLAVE_ALMACEN);
    }
  } catch {
    // Sin almacenamiento, la clave dura hasta recargar la página.
  }
}

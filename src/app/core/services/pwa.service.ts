import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

import { ConfiguracionPush } from '../models/mejoras.model';
import { URL_CAMPUS, esAppInstalada } from './campus.service';

/** Evento que Chrome y Edge lanzan cuando el sitio se puede instalar como app. */
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type EstadoNotificaciones = 'no-disponible' | 'bloqueadas' | 'desactivadas' | 'activadas';

/**
 * App instalable (PWA) y notificaciones push del campus. Al instalarla, el celular la muestra con el escudo
 * del colegio (manifest.webmanifest) y cada aviso del campus (tareas, notas, mensajes, observador) llega como
 * notificación aunque la app esté cerrada.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  readonly #http = inject(HttpClient);
  readonly #swPush = inject(SwPush);
  #eventoInstalacion: EventoInstalacion | null = null;

  /** Se puede ofrecer el botón "Instalar app" (Android, Windows, Chrome OS). */
  readonly instalable = signal(false);
  readonly instalada = signal(esAppInstalada());
  /** iPhone/iPad en Safari: se instala con Compartir → "Agregar a inicio". */
  readonly esIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !esAppInstalada();
  readonly notificaciones = signal<EstadoNotificaciones>('no-disponible');

  constructor() {
    window.addEventListener('beforeinstallprompt', (evento) => {
      evento.preventDefault();
      this.#eventoInstalacion = evento as EventoInstalacion;
      this.instalable.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.#eventoInstalacion = null;
      this.instalable.set(false);
      this.instalada.set(true);
    });

    if (this.#swPush.isEnabled) {
      this.#swPush.subscription.subscribe((suscripcion) => this.#actualizarEstado(suscripcion !== null));
      // Tocar una notificación abre la página del aviso (el service worker de Angular abre la app).
    }
    this.#actualizarEstado(false);
  }

  async instalar(): Promise<boolean> {
    const evento = this.#eventoInstalacion;
    if (!evento) {
      return false;
    }
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    this.#eventoInstalacion = null;
    this.instalable.set(false);
    return outcome === 'accepted';
  }

  /** Pide permiso, suscribe este dispositivo y lo registra en la API. */
  async activarNotificaciones(): Promise<void> {
    if (!this.#swPush.isEnabled) {
      throw new Error('Este navegador no permite notificaciones. Instale la app o use Chrome, Edge, Firefox o Safari actualizado.');
    }
    const configuracion = await firstValueFrom(this.#http.get<ConfiguracionPush>(`${URL_CAMPUS}/push`));
    if (!configuracion.habilitado || !configuracion.clavePublica) {
      throw new Error('El colegio aún no ha activado las notificaciones en el servidor.');
    }
    const suscripcion = await this.#swPush.requestSubscription({ serverPublicKey: configuracion.clavePublica });
    const json = suscripcion.toJSON();
    await firstValueFrom(
      this.#http.post<void>(`${URL_CAMPUS}/push`, {
        endpoint: suscripcion.endpoint,
        p256dh: json.keys?.['p256dh'] ?? '',
        auth: json.keys?.['auth'] ?? '',
      }),
    );
    this.#actualizarEstado(true);
  }

  async desactivarNotificaciones(): Promise<void> {
    const suscripcion = await firstValueFrom(this.#swPush.subscription);
    if (suscripcion) {
      await firstValueFrom(this.#http.delete<void>(`${URL_CAMPUS}/push`, { params: { endpoint: suscripcion.endpoint } })).catch(
        () => undefined,
      );
      await this.#swPush.unsubscribe().catch(() => undefined);
    }
    this.#actualizarEstado(false);
  }

  /** Al iniciar sesión en otro perfil desde el mismo celular, vuelve a registrar el dispositivo a su nombre. */
  async renovarRegistro(): Promise<void> {
    if (!this.#swPush.isEnabled) {
      return;
    }
    const suscripcion = await firstValueFrom(this.#swPush.subscription);
    if (!suscripcion) {
      return;
    }
    const json = suscripcion.toJSON();
    await firstValueFrom(
      this.#http.post<void>(`${URL_CAMPUS}/push`, {
        endpoint: suscripcion.endpoint,
        p256dh: json.keys?.['p256dh'] ?? '',
        auth: json.keys?.['auth'] ?? '',
      }),
    ).catch(() => undefined);
  }

  #actualizarEstado(suscrito: boolean): void {
    if (!this.#swPush.isEnabled || typeof Notification === 'undefined') {
      this.notificaciones.set('no-disponible');
    } else if (Notification.permission === 'denied') {
      this.notificaciones.set('bloqueadas');
    } else {
      this.notificaciones.set(suscrito ? 'activadas' : 'desactivadas');
    }
  }
}

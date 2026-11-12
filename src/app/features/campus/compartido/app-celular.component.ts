import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PwaService } from '../../../core/services/pwa.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/**
 * Tarjeta del inicio del campus: instalar la app con el escudo del colegio y activar las notificaciones
 * de este celular. Se oculta sola cuando ya no hay nada que ofrecer.
 */
@Component({
  selector: 'app-app-celular',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (visible()) {
      <section class="tarjeta app" aria-labelledby="titulo-app">
        <img src="img/icons/icon-192.png" alt="" width="64" height="64" />
        <div class="texto">
          <h2 id="titulo-app">{{ pwa.instalada() ? 'Notificaciones en este celular' : 'Lleve el campus en su celular' }}</h2>
          @if (!pwa.instalada()) {
            <p>Instale la app del colegio: queda en la pantalla de inicio con el escudo y abre directo al campus.</p>
          }
          @if (pwa.esIos && !pwa.instalada()) {
            <p class="ios">
              En iPhone: toque <mat-icon aria-label="Compartir" inline>ios_share</mat-icon> <strong>Compartir</strong> y luego
              <strong>Agregar a inicio</strong>. Las notificaciones funcionan con la app instalada (iOS 16.4 o superior).
            </p>
          }
          @switch (pwa.notificaciones()) {
            @case ('activadas') {
              <p class="ok"><mat-icon aria-hidden="true" inline>notifications_active</mat-icon> Este equipo recibe avisos de tareas, notas, mensajes y observador.</p>
            }
            @case ('bloqueadas') {
              <p class="alerta">Las notificaciones están bloqueadas. Actívelas en los ajustes del navegador para este sitio.</p>
            }
            @case ('desactivadas') {
              <p>Active las notificaciones para enterarse al instante de cada tarea, nota o mensaje.</p>
            }
          }
        </div>
        <div class="acciones">
          @if (pwa.instalable()) {
            <button mat-flat-button class="boton-institucional" type="button" (click)="instalar()">
              <mat-icon aria-hidden="true">install_mobile</mat-icon>
              Instalar app
            </button>
          }
          @if (pwa.notificaciones() === 'desactivadas') {
            <button mat-stroked-button type="button" [disabled]="ocupado()" (click)="activar()">
              <mat-icon aria-hidden="true">notifications</mat-icon>
              Activar notificaciones
            </button>
          } @else if (pwa.notificaciones() === 'activadas') {
            <button mat-button type="button" [disabled]="ocupado()" (click)="desactivar()">Desactivar</button>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .app {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block: 1.25rem;
      border-inline-start: 5px solid var(--jv-amarillo);
    }

    img {
      inline-size: 64px;
      block-size: 64px;
      object-fit: contain;
    }

    .texto {
      flex: 1 1 260px;
    }

    h2 {
      margin: 0 0 0.25rem;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    p {
      margin: 0.2rem 0;
      color: var(--jv-texto-suave);
    }

    .ok {
      color: #0f7b3f;
    }

    .alerta {
      color: var(--jv-rojo);
    }

    .acciones {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `,
})
export class AppCelularComponent {
  readonly #snackBar = inject(MatSnackBar);
  protected readonly pwa = inject(PwaService);
  protected readonly ocupado = signal(false);

  protected readonly visible = computed(
    () =>
      this.pwa.instalable() ||
      (this.pwa.esIos && !this.pwa.instalada()) ||
      this.pwa.notificaciones() !== 'no-disponible',
  );

  protected async instalar(): Promise<void> {
    if (await this.pwa.instalar()) {
      this.#snackBar.open('¡Listo! Busque el escudo del colegio en su pantalla de inicio.', 'Cerrar');
    }
  }

  protected async activar(): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.pwa.activarNotificaciones();
      this.#snackBar.open('Notificaciones activadas en este equipo.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(textoError(error), 'Cerrar');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected async desactivar(): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.pwa.desactivarNotificaciones();
    } finally {
      this.ocupado.set(false);
    }
  }
}

function textoError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return mensajeDeError(error);
  }
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'No se dio permiso para mostrar notificaciones.';
  }
  return error instanceof Error && !(error instanceof DOMException) ? error.message : 'No fue posible activar las notificaciones en este equipo.';
}

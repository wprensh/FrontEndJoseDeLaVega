import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { menuVisible } from '../../core/models/menu-panel';
import { SesionService } from '../../core/services/sesion.service';
import { CambiarClaveDialogComponent } from './cambiar-clave-dialog.component';

const CLAVE_PLEGADO = 'jv-panel-menu-plegado';

/**
 * Estructura del panel administrativo: menú lateral agrupado por área (se pliega a íconos en el computador
 * y se abre con un botón en el celular) y la página del módulo a la derecha.
 */
@Component({
  selector: 'app-panel-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  template: `
    <div class="panel" [class.plegado]="plegado()" [class.abierto]="abierto()">
      <div class="barra-movil no-imprimir">
        <button mat-button type="button" (click)="abierto.set(true)" aria-controls="menu-panel" [attr.aria-expanded]="abierto()">
          <mat-icon>menu</mat-icon>
          Módulos
        </button>
      </div>

      <div class="fondo no-imprimir" (click)="abierto.set(false)" aria-hidden="true"></div>

      <aside id="menu-panel" class="lateral no-imprimir" aria-label="Módulos del panel administrativo">
        <button type="button" class="plegar" (click)="alternarPlegado()" [attr.aria-expanded]="!plegado()">
          <mat-icon aria-hidden="true">{{ plegado() ? 'menu' : 'menu_open' }}</mat-icon>
          <span class="texto">Ocultar menú</span>
        </button>
        <button type="button" class="cerrar-movil" (click)="abierto.set(false)" aria-label="Cerrar menú">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>

        <nav>
          <a
            class="opcion"
            routerLink="/admin"
            routerLinkActive="activo"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            matTooltip="Panel"
            matTooltipPosition="right"
            [matTooltipDisabled]="!plegado()"
          >
            <mat-icon aria-hidden="true">dashboard</mat-icon>
            <span class="texto">Panel</span>
          </a>
          @for (grupo of menu(); track grupo.area) {
            <p class="area">{{ grupo.area }}</p>
            @for (o of grupo.opciones; track o.ruta) {
              <a
                class="opcion"
                [routerLink]="o.ruta"
                routerLinkActive="activo"
                ariaCurrentWhenActive="page"
                [matTooltip]="o.etiqueta"
                matTooltipPosition="right"
                [matTooltipDisabled]="!plegado()"
              >
                <mat-icon aria-hidden="true">{{ o.icono }}</mat-icon>
                <span class="texto">{{ o.etiqueta }}</span>
              </a>
            }
          }
        </nav>

        @if (sesion.usuario(); as usuario) {
          <button type="button" class="usuario" [matMenuTriggerFor]="menuUsuario" [matTooltip]="usuario.nombreCompleto" [matTooltipDisabled]="!plegado()">
            <mat-icon aria-hidden="true">account_circle</mat-icon>
            <span class="texto">{{ usuario.nombreCompleto }}</span>
            <mat-icon aria-hidden="true" class="texto">expand_less</mat-icon>
          </button>
          <mat-menu #menuUsuario="matMenu" yPosition="above">
            <p class="menu-encabezado">
              <strong>{{ usuario.nombreUsuario }}</strong>
              <span>{{ usuario.esSuperAdministrador ? 'Superadministrador' : 'Usuario del panel' }}</span>
            </p>
            <mat-divider />
            <button mat-menu-item type="button" (click)="cambiarClave()">
              <mat-icon>key</mat-icon>
              Cambiar contraseña
            </button>
            <button mat-menu-item type="button" (click)="salir()">
              <mat-icon>logout</mat-icon>
              Cerrar sesión
            </button>
          </mat-menu>
        }
      </aside>

      <div class="contenido">
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .panel {
      --ancho-menu: 236px;
      display: grid;
      grid-template-columns: var(--ancho-menu) minmax(0, 1fr);
      min-block-size: 100%;
      transition: grid-template-columns 0.2s ease;

      &.plegado { --ancho-menu: 64px; }
    }

    .lateral {
      position: sticky;
      inset-block-start: 0;
      align-self: start;
      min-inline-size: 0;
      display: flex;
      flex-direction: column;
      block-size: 100dvh;
      background: var(--jv-superficie);
      border-inline-end: 1px solid var(--jv-borde);
      overflow: hidden;
      z-index: 5;
    }

    nav {
      display: grid;
      align-content: start;
      gap: 2px;
      padding: 0.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .area {
      margin: 0;
      padding: 0.85rem 0.6rem 0.3rem;
      color: var(--jv-texto-suave);
      font: 700 0.68rem / 1 var(--jv-fuente-titulos);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .opcion, .plegar, .usuario, .cerrar-movil {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      min-block-size: 2.5rem;
      padding: 0 0.65rem;
      border: 0;
      border-radius: 8px;
      background: none;
      color: var(--jv-texto);
      font: 500 0.92rem / 1.2 var(--jv-fuente-texto);
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;

      mat-icon { flex: none; color: var(--jv-azul-medio); }
      &:hover { background: var(--jv-superficie-suave); }
      &:focus-visible { outline: 2px solid var(--jv-azul-medio); outline-offset: -2px; }
    }

    .opcion.activo {
      background: #e8eef8;
      color: var(--jv-azul);
      font-weight: 700;
      box-shadow: inset 3px 0 0 var(--jv-amarillo);
      mat-icon { color: var(--jv-azul); }
    }

    .plegar {
      border-radius: 0;
      border-block-end: 1px solid var(--jv-borde);
      color: var(--jv-texto-suave);
      min-block-size: 2.75rem;
      padding-inline: 1.25rem;
    }

    .usuario {
      border-radius: 0;
      border-block-start: 1px solid var(--jv-borde);
      min-block-size: 3.25rem;
      padding-inline: 1.25rem;
      font-weight: 600;

      .texto:first-of-type { overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: start; }
    }

    .cerrar-movil, .barra-movil, .fondo { display: none; }

    .plegado {
      .texto { display: none; }
      .area { overflow: hidden; block-size: 0.6rem; padding: 0; font-size: 0; }
      .opcion { justify-content: center; padding: 0; }
      .plegar, .usuario { justify-content: center; padding: 0; }
    }

    .menu-encabezado {
      display: grid;
      margin: 0;
      padding: 0.5rem 1rem 0.75rem;
      span { color: var(--jv-texto-suave); font-size: 0.85rem; }
    }

    @media (max-width: 900px) {
      .panel, .panel.plegado { grid-template-columns: minmax(0, 1fr); }

      .barra-movil {
        display: flex;
        position: sticky;
        inset-block-start: 0;
        z-index: 4;
        background: var(--jv-superficie);
        border-block-end: 1px solid var(--jv-borde);
        padding: 0.25rem 0.5rem;
      }

      .lateral {
        position: fixed;
        inset-block: 0;
        inset-inline-start: 0;
        inline-size: min(300px, 85vw);
        transform: translateX(-100%);
        transition: transform 0.2s ease;
        z-index: 1001;
        box-shadow: 0 0 24px rgb(10 38 71 / 25%);
      }

      .plegar { display: none; }
      .cerrar-movil { display: flex; align-self: flex-end; justify-content: center; margin: 0.25rem; inline-size: 2.5rem; padding: 0; }

      /* En el celular el menú siempre se ve completo, aunque esté plegado en el computador. */
      .plegado {
        .texto { display: revert; }
        .area { block-size: auto; padding: 0.85rem 0.6rem 0.3rem; font-size: 0.68rem; }
        .opcion { justify-content: flex-start; padding: 0 0.65rem; }
        .usuario { justify-content: flex-start; padding-inline: 1.25rem; }
      }

      .abierto .lateral { transform: none; }
      .abierto .fondo { display: block; position: fixed; inset: 0; background: rgb(6 24 46 / 45%); z-index: 1000; }
    }

    @media print {
      .panel, .panel.plegado { display: block; }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel, .lateral { transition: none; }
    }
  `,
})
export class PanelAdminComponent {
  readonly #dialog = inject(MatDialog);
  readonly #router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected readonly menu = computed(() => {
    this.sesion.usuario(); // Dependencia: cambia con los permisos de la sesión.
    return menuVisible((m) => this.sesion.puede(m, 'Ver'));
  });

  protected readonly plegado = signal(leerPlegado());
  protected readonly abierto = signal(false);

  constructor() {
    // En el celular el menú se cierra al cambiar de página.
    this.#router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.abierto.set(false));
  }

  protected alternarPlegado(): void {
    const valor = !this.plegado();
    this.plegado.set(valor);
    try {
      localStorage.setItem(CLAVE_PLEGADO, valor ? '1' : '0');
    } catch {
      // Sin almacenamiento local el menú simplemente no recuerda la preferencia.
    }
  }

  protected cambiarClave(): void {
    this.#dialog.open(CambiarClaveDialogComponent, { width: '420px', maxWidth: '95vw' });
  }

  protected salir(): void {
    this.sesion.cerrar();
    void this.#router.navigate(['/admin/login']);
  }
}

function leerPlegado(): boolean {
  try {
    return localStorage.getItem(CLAVE_PLEGADO) === '1';
  } catch {
    return false;
  }
}

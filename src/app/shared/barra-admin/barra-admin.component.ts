import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { MODULOS } from '../../core/models/usuario.model';
import { SesionService } from '../../core/services/sesion.service';
import { CambiarClaveDialogComponent } from './cambiar-clave-dialog.component';

/**
 * Barra común de las páginas del panel: módulos que el usuario puede ver, su nombre,
 * cambio de contraseña y cierre de sesión. Un módulo nuevo aparece aquí al agregarlo a MODULOS.
 */
@Component({
  selector: 'app-barra-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <nav class="barra" aria-label="Módulos del panel administrativo">
      <a mat-button routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon aria-hidden="true">dashboard</mat-icon>
        Panel
      </a>
      @for (modulo of modulos(); track modulo.modulo) {
        <a mat-button [routerLink]="modulo.ruta" routerLinkActive="activo">
          <mat-icon aria-hidden="true">{{ modulo.icono }}</mat-icon>
          {{ modulo.etiqueta }}
        </a>
      }

      @if (sesion.usuario(); as usuario) {
        <button mat-button type="button" class="usuario" [matMenuTriggerFor]="menuUsuario">
          <mat-icon aria-hidden="true">account_circle</mat-icon>
          <span class="nombre">{{ usuario.nombreCompleto }}</span>
          <mat-icon aria-hidden="true" iconPositionEnd>expand_more</mat-icon>
        </button>
        <mat-menu #menuUsuario="matMenu" xPosition="before">
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
    </nav>
  `,
  styles: `
    .barra {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
      background: var(--jv-superficie);
      border-radius: var(--jv-radio);
      box-shadow: var(--jv-sombra);
      padding: 0.35rem 0.5rem;
      margin-block-end: 1.25rem;
    }

    a.activo {
      background: var(--jv-superficie-suave);
      color: var(--jv-azul);
      font-weight: 700;
    }

    .usuario {
      margin-inline-start: auto;
    }

    .nombre {
      max-inline-size: 18ch;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .menu-encabezado {
      display: grid;
      margin: 0;
      padding: 0.5rem 1rem 0.75rem;

      span {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
      }
    }

    @media (max-width: 600px) {
      .nombre {
        display: none;
      }
    }
  `,
})
export class BarraAdminComponent {
  readonly #dialog = inject(MatDialog);
  readonly #router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected readonly modulos = computed(() => {
    this.sesion.usuario(); // Dependencia: cambia con los permisos de la sesión.
    return MODULOS.filter((m) => m.ruta !== null && this.sesion.puede(m.modulo, 'Ver'));
  });

  protected cambiarClave(): void {
    this.#dialog.open(CambiarClaveDialogComponent, { width: '420px', maxWidth: '95vw' });
  }

  protected salir(): void {
    this.sesion.cerrar();
    void this.#router.navigate(['/admin/login']);
  }
}

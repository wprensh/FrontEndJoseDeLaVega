import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { ACCIONES, MODULOS } from '../../../core/models/usuario.model';
import { SesionService } from '../../../core/services/sesion.service';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/** Inicio del panel: los módulos que el usuario de la sesión puede usar y qué puede hacer en cada uno. */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, BarraAdminComponent, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Panel administrativo"
        [subtitulo]="'Hola, ' + (sesion.usuario()?.nombreCompleto ?? '') + '. Elija el módulo con el que va a trabajar.'"
        etiqueta="Panel administrativo"
      />
      <app-barra-admin />

      @if (sinPermiso(); as modulo) {
        <p class="aviso" role="alert">
          <mat-icon aria-hidden="true">info</mat-icon>
          Su usuario no tiene permiso para entrar a {{ modulo }}. Si lo necesita, pídaselo al administrador del panel.
        </p>
      }

      @if (modulos().length) {
        <ul class="modulos">
          @for (m of modulos(); track m.info.modulo) {
            <li>
              <a class="tarjeta-franja franja-amarilla modulo" [routerLink]="m.info.ruta">
                <mat-icon class="icono" aria-hidden="true">{{ m.info.icono }}</mat-icon>
                <h2>{{ m.info.etiqueta }}</h2>
                <p>{{ m.info.descripcion }}</p>
                <ul class="acciones" aria-label="Lo que puede hacer">
                  @for (accion of m.acciones; track accion) {
                    <li>{{ accion }}</li>
                  }
                </ul>
              </a>
            </li>
          }
        </ul>
      } @else {
        <section class="tarjeta vacio">
          <mat-icon aria-hidden="true">lock_person</mat-icon>
          <p>Su usuario todavía no tiene módulos asignados. Pídale al administrador del panel que le dé permisos.</p>
        </section>
      }
    </div>
  `,
  styles: `
    .modulos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .modulo {
      display: grid;
      gap: 0.4rem;
      block-size: 100%;
      color: inherit;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover,
      &:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgb(10 38 71 / 14%);
      }

      h2 {
        margin: 0;
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.15rem;
      }

      p {
        margin: 0;
        color: var(--jv-texto-suave);
      }
    }

    .icono {
      color: var(--jv-azul-medio);
      font-size: 34px;
      inline-size: 34px;
      block-size: 34px;
    }

    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.4rem 0 0;
      padding: 0;
      list-style: none;

      li {
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
        background: var(--jv-superficie-suave);
        border: 1px solid var(--jv-borde);
        font-size: 0.8rem;
        font-weight: 600;
      }
    }

    .aviso {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1.25rem;
      padding: 0.75rem 1rem;
      border-radius: var(--jv-radio);
      background: #fff7d6;
      color: var(--jv-texto);
    }

    .vacio {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--jv-texto-suave);

      p {
        margin: 0;
      }
    }
  `,
})
export class PanelComponent implements OnInit {
  protected readonly sesion = inject(SesionService);

  /** Módulo al que se intentó entrar sin permiso (?sinPermiso=Usuarios). */
  readonly sinPermisoModulo = input<string>(undefined, { alias: 'sinPermiso' });

  protected readonly sinPermiso = computed(
    () => MODULOS.find((m) => m.modulo === this.sinPermisoModulo())?.etiqueta ?? null,
  );

  protected readonly modulos = computed(() => {
    this.sesion.usuario(); // Dependencia: se recalcula al actualizar el perfil.
    return MODULOS.filter((info) => info.ruta !== null && this.sesion.puede(info.modulo, 'Ver')).map((info) => ({
      info,
      acciones: ACCIONES.filter((a) => this.sesion.puede(info.modulo, a)).map((a) => info.acciones[a]),
    }));
  });

  ngOnInit(): void {
    // Los permisos pueden haber cambiado desde que se inició la sesión.
    this.sesion.actualizarPerfil().catch(() => undefined);
  }
}

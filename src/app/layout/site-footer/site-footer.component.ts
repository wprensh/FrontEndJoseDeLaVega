import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { INSTITUCION, NAVEGACION } from '../../core/institucion';

/** Pie de página: navegación secundaria, redes sociales y franja del lema institucional. */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="pie">
      <nav aria-label="Navegación del pie de página">
        @for (enlace of enlaces; track enlace.ruta) {
          <a [routerLink]="enlace.ruta" routerLinkActive="activo">{{ enlace.etiqueta }}</a>
        }
        <a routerLink="/admin/noticias" routerLinkActive="activo">Administrar</a>
      </nav>

      <div class="redes">
        <a [href]="institucion.redes.facebook" target="_blank" rel="noopener" aria-label="Facebook">
          <mat-icon>facebook</mat-icon>
        </a>
        <a [href]="institucion.redes.instagram" target="_blank" rel="noopener" aria-label="Instagram">
          <mat-icon>photo_camera</mat-icon>
        </a>
        <a [href]="institucion.redes.youtube" target="_blank" rel="noopener" aria-label="YouTube">
          <mat-icon>smart_display</mat-icon>
        </a>
      </div>
    </div>
    <p class="lema">{{ institucion.lema }}</p>
  `,
  styles: `
    :host { display: block; background: var(--jv-azul); color: #fff; }
    .pie {
      max-inline-size: var(--jv-ancho-maximo);
      margin-inline: auto;
      padding: 0.6rem var(--jv-margen);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    nav { display: flex; flex-wrap: wrap; gap: 0.35rem 1.1rem; }
    a {
      color: #fff;
      text-decoration: none;
      font: 700 0.8rem / 1.4 var(--jv-fuente-titulos);
      text-transform: uppercase;
    }
    a:hover, a.activo { color: var(--jv-amarillo); }
    .redes { display: flex; gap: 0.6rem; }
    .redes a { color: var(--jv-amarillo); display: inline-flex; }
    .lema {
      margin: 0;
      background: var(--jv-amarillo);
      color: var(--jv-azul);
      text-align: center;
      padding: 0.45rem;
      font: 700 0.85rem / 1.2 var(--jv-fuente-titulos);
      text-transform: uppercase;
    }
  `,
})
export class SiteFooterComponent {
  protected readonly institucion = INSTITUCION;
  /** El pie no repite "Campus Virtual", igual que en la plantilla. */
  protected readonly enlaces = NAVEGACION.filter((e) => e.ruta !== '/campus');
}

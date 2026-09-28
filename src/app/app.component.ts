import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';

/** Estructura común a todas las plantillas: encabezado, contenido de la ruta y pie de página. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <a class="saltar-contenido" href="#contenido">Saltar al contenido</a>
    <app-site-header />
    <main id="contenido" tabindex="-1">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-block-size: 100dvh; }
    main { flex: 1; outline: none; }
  `,
})
export class AppComponent {}

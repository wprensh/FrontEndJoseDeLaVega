import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Encabezado de sección: tarjeta blanca con borde amarillo, título, subtítulo y etiqueta. */
@Component({
  selector: 'app-page-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="texto">
      <h1>{{ titulo() }}</h1>
      @if (subtitulo()) {
        <p>{{ subtitulo() }}</p>
      }
    </div>
    @if (etiqueta()) {
      <span class="etiqueta">{{ etiqueta() }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      background: var(--jv-superficie);
      border-left: 6px solid var(--jv-amarillo);
      border-radius: var(--jv-radio);
      padding: 1.1rem 1.75rem;
      margin-block-end: 1.25rem;
    }
    h1 {
      font: 700 clamp(1.25rem, 2.4vw, 1.7rem) / 1.2 var(--jv-fuente-titulos);
      color: var(--jv-azul);
      margin: 0;
    }
    p { margin: 0.25rem 0 0; color: var(--jv-texto-suave); }
    .etiqueta {
      background: var(--jv-azul);
      color: var(--jv-amarillo);
      font: 700 0.75rem / 1 var(--jv-fuente-titulos);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      white-space: nowrap;
    }
  `,
})
export class PageHeadingComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
  readonly etiqueta = input<string>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Escudo institucional.
 * Muestra `public/img/escudo.png` si existe; mientras tanto se usa un escudo SVG con los
 * colores oficiales. Para usar el escudo real, copie el archivo en public/img/escudo.png
 * y cambie `usarImagen` a true.
 */
@Component({
  selector: 'app-escudo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'escudo', '[style.--escudo-tamano.px]': 'tamano()' },
  template: `
    @if (usarImagen) {
      <img src="img/escudo.png" alt="Escudo de la I.E. José de la Vega" [width]="tamano()" [height]="tamano()" />
    } @else {
      <svg viewBox="0 0 64 64" role="img" aria-label="Escudo de la I.E. José de la Vega">
        <path d="M32 3 58 11v18c0 16-11 26-26 32C17 55 6 45 6 29V11L32 3Z" fill="#1d4f91" />
        <path d="M32 8 53 14v15c0 13-9 21-21 26-12-5-21-13-21-26V14L32 8Z" fill="#fff" />
        <path d="M13 16 32 10v42c-10-5-19-12-19-23V16Z" fill="#ffc700" />
        <path d="M32 10l19 6v13c0 11-9 18-19 23V10Z" fill="#1d4f91" />
        <path d="M32 31 51 29c-1 10-9 17-19 23V31Z" fill="#d7263d" />
        <path d="M20 24h24v12H20z" fill="#fff" stroke="#0a2647" stroke-width="1.5" />
        <path d="M32 24v12M20 24c4-2 8-2 12 0 4-2 8-2 12 0" fill="none" stroke="#0a2647" stroke-width="1.5" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      inline-size: var(--escudo-tamano);
      block-size: var(--escudo-tamano);
      background: #fff;
      border-radius: 4px;
      padding: 4px;
      box-sizing: border-box;
    }
    svg, img { inline-size: 100%; block-size: 100%; object-fit: contain; }
  `,
})
export class EscudoComponent {
  /** Tamaño en píxeles (lado del cuadrado). */
  readonly tamano = input(62);

  protected readonly usarImagen = false;
}

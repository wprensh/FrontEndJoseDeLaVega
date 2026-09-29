import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Escudo oficial de la I.E. José de la Vega.
 *
 * Archivos en `public/img/` (fondo transparente, 160×160 px):
 * - `escudo.webp`: formato principal, ~11 KB.
 * - `escudo.png`: respaldo para navegadores sin WebP.
 *
 * El escudo se muestra a 62 px en el encabezado; 160 px cubre pantallas de alta densidad
 * (hasta 2,5×) con nitidez. Si se consigue el escudo original en mayor resolución (ideal: SVG
 * o PNG de 512×512 px), basta con reemplazar esos dos archivos.
 */
@Component({
  selector: 'app-escudo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'escudo', '[style.--escudo-tamano.px]': 'tamano()' },
  template: `
    <picture>
      <source srcset="img/escudo.webp" type="image/webp" />
      <img
        src="img/escudo.png"
        alt="Escudo de la Institución Educativa José de la Vega"
        [width]="tamano()"
        [height]="tamano()"
        decoding="async"
      />
    </picture>
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      inline-size: var(--escudo-tamano);
      block-size: var(--escudo-tamano);
      background: #fff;
      border-radius: 4px;
      padding: 3px;
      box-sizing: border-box;
      flex: none;
    }
    picture, img { display: block; inline-size: 100%; block-size: 100%; object-fit: contain; }
  `,
})
export class EscudoComponent {
  /** Tamaño en píxeles (lado del cuadrado). */
  readonly tamano = input(62);
}

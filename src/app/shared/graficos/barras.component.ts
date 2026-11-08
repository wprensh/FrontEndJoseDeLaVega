import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Barra {
  readonly etiqueta: string;
  /** Valor de 0 a `maximo`. */
  readonly valor: number;
  /** Texto a la derecha; por defecto el valor con el sufijo. */
  readonly texto?: string;
}

/**
 * Barras horizontales accesibles (lista con el valor escrito, no solo color).
 * Las barras bajo el umbral se pintan en rojo, entre umbral y meta en amarillo y sobre la meta en azul.
 */
@Component({
  selector: 'app-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <ul class="barras">
      @for (b of barras(); track b.etiqueta) {
        <li>
          <span class="etiqueta">{{ b.etiqueta }}</span>
          <span class="pista" aria-hidden="true">
            <span
              class="relleno"
              [class.bajo]="b.valor < umbral()"
              [class.medio]="b.valor >= umbral() && b.valor < meta()"
              [style.inline-size.%]="(b.valor / maximo()) * 100"
            ></span>
          </span>
          <span class="valor">{{ b.texto ?? ((b.valor | number: decimales()) + sufijo()) }}</span>
        </li>
      } @empty {
        <li class="vacio">Sin datos todavía.</li>
      }
    </ul>
  `,
  styles: `
    .barras {
      display: grid;
      gap: 0.55rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-template-columns: minmax(7rem, 11rem) 1fr auto;
      align-items: center;
      gap: 0.75rem;
    }

    .etiqueta {
      font-size: 0.9rem;
    }

    .pista {
      block-size: 0.8rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      overflow: hidden;
    }

    .relleno {
      display: block;
      block-size: 100%;
      background: var(--jv-azul-medio);
      border-radius: 999px;

      &.medio {
        background: var(--jv-amarillo);
      }

      &.bajo {
        background: var(--jv-rojo);
      }
    }

    .valor {
      min-inline-size: 3.5rem;
      font-weight: 700;
      text-align: end;
      font-variant-numeric: tabular-nums;
    }

    .vacio {
      display: block;
      color: var(--jv-texto-suave);
    }

    @media print {
      .relleno {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `,
})
export class BarrasComponent {
  readonly barras = input.required<readonly Barra[]>();
  readonly maximo = input(100);
  readonly umbral = input(40);
  readonly meta = input(60);
  readonly sufijo = input(' %');
  readonly decimales = input('1.0-0');
}

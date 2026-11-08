import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { INSTITUCION } from '../../core/institucion';
import { RolCampus, cursoDe } from '../../core/models/campus.model';
import { EscudoComponent } from '../escudo/escudo.component';

export interface DatosCarnet {
  readonly nombreCompleto: string;
  readonly documento: string;
  readonly rol: RolCampus;
  readonly grado: number | null;
  readonly grupo: string | null;
  readonly codigoCarnet: string;
}

/**
 * Carné institucional tamaño tarjeta (85,6 × 54 mm al imprimir) con código QR.
 * El QR abre /carnet/{codigo} en el sitio, donde portería o cualquier persona confirma que está vigente.
 */
@Component({
  selector: 'app-carnet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EscudoComponent],
  template: `
    @let c = datos();
    <article class="carnet" [attr.data-rol]="c.rol" [attr.aria-label]="'Carné de ' + c.nombreCompleto">
      <header>
        <app-escudo [tamano]="34" />
        <div>
          <strong>{{ institucion.nombreCorto }}</strong>
          <span>{{ institucion.ciudad }}</span>
        </div>
        <span class="anio">{{ anio() }}</span>
      </header>
      <div class="cuerpo">
        <div class="datos">
          <span class="rol">{{ etiquetaRol() }}</span>
          <strong class="nombre">{{ c.nombreCompleto }}</strong>
          <span>Doc. {{ c.documento }}</span>
          @if (c.rol === 'Estudiante') {
            <span>Curso {{ curso() }}</span>
          }
          <span class="codigo">{{ c.codigoCarnet }}</span>
        </div>
        @if (qr(); as imagen) {
          <img class="qr" [src]="imagen" alt="Código QR de verificación del carné" />
        } @else {
          <span class="qr cargando" aria-hidden="true"></span>
        }
      </div>
      <footer>“{{ institucion.lema }}” · Verifique en {{ dominio() }}</footer>
    </article>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .carnet {
      --color: var(--jv-azul);
      display: grid;
      grid-template-rows: auto 1fr auto;
      inline-size: 340px;
      max-inline-size: 100%;
      aspect-ratio: 85.6 / 54;
      overflow: hidden;
      border-radius: 12px;
      background: #fff;
      border: 1px solid var(--jv-borde);
      box-shadow: var(--jv-sombra);
      color: #111;
      font-size: 11px;

      &[data-rol='Docente'] {
        --color: #0f5d31;
      }

      &[data-rol='Acudiente'] {
        --color: #6b3fa0;
      }
    }

    header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.7rem;
      background: var(--color);
      color: #fff;

      div {
        display: grid;
        line-height: 1.15;
      }

      strong {
        font-family: var(--jv-fuente-titulos);
        font-size: 12px;
      }
    }

    .anio {
      margin-inline-start: auto;
      padding: 0.1rem 0.5rem;
      border-radius: 4px;
      background: var(--jv-amarillo);
      color: var(--jv-azul);
      font-weight: 800;
    }

    .cuerpo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.7rem;
    }

    .datos {
      display: grid;
      gap: 0.1rem;
      min-inline-size: 0;
    }

    .rol {
      color: var(--color);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .nombre {
      font-family: var(--jv-fuente-titulos);
      font-size: 14px;
      line-height: 1.15;
      text-transform: uppercase;
    }

    .codigo {
      font-family: ui-monospace, monospace;
      letter-spacing: 0.08em;
      color: #444;
    }

    .qr {
      flex: none;
      inline-size: 92px;
      block-size: 92px;
      margin-inline-start: auto;

      &.cargando {
        background: var(--jv-superficie-suave);
      }
    }

    footer {
      padding: 0.25rem 0.7rem;
      border-block-start: 3px solid var(--jv-amarillo);
      color: #555;
      font-size: 9px;
      text-align: center;
    }

    @media print {
      .carnet {
        inline-size: 85.6mm;
        block-size: 54mm;
        box-shadow: none;
        break-inside: avoid;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `,
})
export class CarnetComponent {
  readonly datos = input.required<DatosCarnet>();

  protected readonly institucion = INSTITUCION;
  protected readonly qr = signal<string | null>(null);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly curso = computed(() => cursoDe(this.datos()));
  protected readonly etiquetaRol = computed(() => {
    const rol = this.datos().rol;
    return rol === 'Estudiante' ? 'Estudiante' : rol === 'Docente' ? 'Docente' : 'Acudiente';
  });
  protected readonly url = computed(() => new URL(`carnet/${this.datos().codigoCarnet}`, document.baseURI).href);
  protected readonly dominio = computed(() => new URL(document.baseURI).host);

  constructor() {
    effect(() => {
      void this.#generarQr(this.url());
    });
  }

  async #generarQr(url: string): Promise<void> {
    const { toDataURL } = await import('qrcode');
    const imagen = await toDataURL(url, { margin: 0, width: 200, color: { dark: '#0a2647', light: '#ffffff' } });
    if (this.url() === url) {
      this.qr.set(imagen);
    }
  }
}

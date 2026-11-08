import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Anotacion, ESTADOS_CASO, TIPOS_ANOTACION } from '../../core/models/academico.model';
import { cursoDe } from '../../core/models/campus.model';

/** Anotación del observador con su tipo, descripción, compromisos, seguimientos y si el acudiente la leyó. */
@Component({
  selector: 'app-anotacion-tarjeta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule],
  template: `
    @let a = anotacion();
    <article class="anotacion" [attr.data-tipo]="a.tipo">
      <header>
        <span class="tipo">{{ tipos[a.tipo] }}</span>
        @if (a.tipo !== 'Positiva' && a.tipo !== 'Observacion') {
          <span class="estado" [attr.data-estado]="a.estado">{{ estados[a.estado] }}</span>
        }
        <time [attr.datetime]="a.fecha">{{ a.fecha | date: "EEEE d 'de' MMMM 'de' y" }}</time>
      </header>
      @if (mostrarEstudiante()) {
        <p class="estudiante">{{ a.estudianteNombre }} · {{ cursoDe(a) }}</p>
      }
      <p class="descripcion">{{ a.descripcion }}</p>
      @if (a.compromisos) {
        <p class="compromisos"><strong>Compromisos:</strong> {{ a.compromisos }}</p>
      }
      @if (a.seguimientos.length) {
        <ol class="seguimientos" aria-label="Seguimientos">
          @for (s of a.seguimientos; track s.id) {
            <li>
              <span class="meta">{{ s.creadoEn | date: 'd MMM y, h:mm a' }} · {{ s.autorNombre }}</span>
              {{ s.texto }}
            </li>
          }
        </ol>
      }
      <footer>
        <span>Registró: {{ a.autorNombre }}</span>
        @if (a.enteradoEn) {
          <span class="enterado">
            <mat-icon aria-hidden="true">done_all</mat-icon>
            Leída por {{ a.enteradoPor }} el {{ a.enteradoEn | date: 'd MMM, h:mm a' }}
          </span>
        }
        <ng-content />
      </footer>
    </article>
  `,
  styles: `
    .anotacion {
      padding: 1rem 1.2rem;
      background: var(--jv-superficie);
      border: 1px solid var(--jv-borde);
      border-left: 5px solid var(--color, var(--jv-azul-medio));
      border-radius: 2px;

      &[data-tipo='Positiva'] {
        --color: #0f7b3f;
      }

      &[data-tipo='SituacionTipoI'] {
        --color: var(--jv-amarillo);
      }

      &[data-tipo='SituacionTipoII'] {
        --color: var(--jv-naranja);
      }

      &[data-tipo='SituacionTipoIII'] {
        --color: var(--jv-rojo);
      }
    }

    header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .tipo {
      color: var(--color, var(--jv-azul));
      font-family: var(--jv-fuente-titulos);
      font-weight: 700;
      filter: brightness(0.8);
    }

    .estado {
      padding: 0.05rem 0.55rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.78rem;
      font-weight: 600;

      &[data-estado='Cerrado'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
      }
    }

    time {
      margin-inline-start: auto;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .estudiante {
      margin: 0.3rem 0 0;
      font-weight: 700;
    }

    .descripcion {
      margin: 0.5rem 0;
      white-space: pre-line;
    }

    .compromisos {
      margin: 0 0 0.5rem;
      padding: 0.5rem 0.7rem;
      background: var(--jv-superficie-suave);
      border-radius: 6px;
    }

    .seguimientos {
      display: grid;
      gap: 0.4rem;
      margin: 0.5rem 0;
      padding-inline-start: 1.2rem;

      .meta {
        display: block;
        color: var(--jv-texto-suave);
        font-size: 0.8rem;
      }
    }

    footer {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .enterado {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #0f7b3f;

      mat-icon {
        font-size: 18px;
        inline-size: 18px;
        block-size: 18px;
      }
    }
  `,
})
export class AnotacionTarjetaComponent {
  readonly anotacion = input.required<Anotacion>();
  readonly mostrarEstudiante = input(false);

  protected readonly tipos = TIPOS_ANOTACION;
  protected readonly estados = ESTADOS_CASO;
  protected readonly cursoDe = cursoDe;
}

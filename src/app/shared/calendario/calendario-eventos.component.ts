import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Evento, TIPOS_EVENTO } from '../../core/models/comunicaciones.model';

interface Mes {
  readonly clave: string;
  readonly fecha: Date;
  readonly eventos: readonly Evento[];
}

/** Fecha "2026-11-07" como Date local (sin corrimiento por zona horaria). */
export function fechaLocal(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/** Eventos del calendario escolar agrupados por mes. */
@Component({
  selector: 'app-calendario-eventos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule],
  template: `
    @for (mes of meses(); track mes.clave) {
      <section class="mes" [attr.aria-label]="(mes.fecha | date: 'MMMM y') ?? ''">
        <h2>{{ mes.fecha | date: 'MMMM y' }}</h2>
        <ul>
          @for (e of mes.eventos; track e.id) {
            <li class="evento" [attr.data-tipo]="e.tipo">
              <div class="dia">
                <span class="numero">{{ local(e.inicio) | date: 'd' }}</span>
                <span>{{ local(e.inicio) | date: 'EEE' }}</span>
              </div>
              <div class="detalle">
                <span class="tipo">{{ tipos[e.tipo] }}</span>
                <strong>{{ e.titulo }}</strong>
                <span class="meta">
                  @if (e.fin !== e.inicio) {
                    Hasta el {{ local(e.fin) | date: "EEEE d 'de' MMMM" }}
                  }
                  @if (e.hora) {
                    <span><mat-icon aria-hidden="true">schedule</mat-icon>{{ e.hora }}</span>
                  }
                  @if (e.lugar) {
                    <span><mat-icon aria-hidden="true">place</mat-icon>{{ e.lugar }}</span>
                  }
                </span>
                @if (e.descripcion) {
                  <p>{{ e.descripcion }}</p>
                }
              </div>
            </li>
          }
        </ul>
      </section>
    } @empty {
      <p class="tarjeta vacio">No hay eventos programados en estas fechas.</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 1.5rem;
    }

    h2 {
      margin: 0 0 0.6rem;
      color: var(--jv-azul);
      font-family: var(--jv-fuente-titulos);
      font-size: 1.15rem;
      text-transform: capitalize;
    }

    ul {
      display: grid;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .evento {
      --color: var(--jv-azul-medio);
      display: flex;
      gap: 1rem;
      padding: 0.8rem 1rem;
      background: var(--jv-superficie);
      border: 1px solid var(--jv-borde);
      border-left: 5px solid var(--color);
      border-radius: 2px;

      &[data-tipo='Festivo'] {
        --color: var(--jv-rojo);
      }

      &[data-tipo='Evaluacion'] {
        --color: var(--jv-naranja);
      }

      &[data-tipo='Reunion'] {
        --color: #6b3fa0;
      }

      &[data-tipo='Deportivo'],
      &[data-tipo='Cultural'] {
        --color: #0f7b3f;
      }
    }

    .dia {
      display: grid;
      justify-items: center;
      align-content: start;
      min-inline-size: 3rem;
      color: var(--jv-texto-suave);
      font-size: 0.8rem;
      text-transform: uppercase;

      .numero {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1;
      }
    }

    .detalle {
      display: grid;
      gap: 0.15rem;

      p {
        margin: 0.2rem 0 0;
        color: var(--jv-texto-suave);
      }
    }

    .tipo {
      color: var(--color);
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem;
      color: var(--jv-texto-suave);
      font-size: 0.88rem;

      span {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }

      mat-icon {
        font-size: 16px;
        inline-size: 16px;
        block-size: 16px;
      }
    }

    .vacio {
      color: var(--jv-texto-suave);
    }
  `,
})
export class CalendarioEventosComponent {
  readonly eventos = input.required<readonly Evento[]>();

  protected readonly tipos = TIPOS_EVENTO;
  protected readonly local = fechaLocal;

  protected readonly meses = computed<Mes[]>(() => {
    const grupos = new Map<string, Evento[]>();
    for (const e of [...this.eventos()].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
      const clave = e.inicio.slice(0, 7);
      grupos.set(clave, [...(grupos.get(clave) ?? []), e]);
    }
    return [...grupos].map(([clave, eventos]) => ({ clave, fecha: fechaLocal(`${clave}-01`), eventos }));
  });
}

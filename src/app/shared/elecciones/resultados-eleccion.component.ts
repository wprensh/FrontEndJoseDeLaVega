import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { Resultados, infoCargo, porcentaje } from '../../core/models/eleccion.model';
import { FotoCandidatoComponent } from './foto-candidato.component';

/**
 * Resultados de una elección: participación por grado y, si el conteo está disponible,
 * los votos de cada contienda con el ganador. Lo usan el panel (en vivo) y el campus (al cierre).
 */
@Component({
  selector: 'app-resultados-eleccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatIconModule, FotoCandidatoComponent],
  template: `
    @let r = resultados();
    <section class="tarjeta participacion" aria-labelledby="titulo-participacion">
      <h3 id="titulo-participacion">Participación</h3>
      <p class="total">
        <strong>{{ r.participacion.votantes | number }}</strong> de {{ r.participacion.habilitados | number }}
        estudiantes han votado ({{ pct(r.participacion.votantes, r.participacion.habilitados) }}%).
      </p>
      <ul class="barras">
        @for (g of r.participacion.porGrado; track g.grado) {
          <li>
            <span class="etiqueta">{{ g.nombreGrado }}</span>
            <span class="barra" role="img" [attr.aria-label]="g.votantes + ' de ' + g.habilitados + ' votaron'">
              <span class="relleno" [style.inline-size.%]="pct(g.votantes, g.habilitados)"></span>
            </span>
            <span class="cifra">{{ g.votantes }}/{{ g.habilitados }}</span>
          </li>
        }
      </ul>
    </section>

    @if (r.conteoDisponible) {
      @for (c of r.contiendas; track c.cargo + c.ambito) {
        <section class="tarjeta contienda" [attr.aria-label]="c.nombreCargo + ', ' + c.nombreAmbito">
          <header>
            <mat-icon aria-hidden="true">{{ icono(c.cargo) }}</mat-icon>
            <div>
              <h3>{{ c.nombreCargo }}</h3>
              <p>{{ c.nombreAmbito }} · {{ c.totalVotos | number }} {{ c.totalVotos === 1 ? 'voto' : 'votos' }}</p>
            </div>
          </header>

          <ol class="candidatos">
            @for (cand of c.candidatos; track cand.candidatoId) {
              <li [class.ganador]="cand.candidatoId === c.ganadorId">
                <app-foto-candidato [nombre]="cand.nombreCompleto" [fotoUrl]="cand.fotoUrl" style="--tamano: 44px" />
                <div class="datos">
                  <span class="nombre">
                    {{ cand.numero }}. {{ cand.nombreCompleto }}
                    @if (cand.candidatoId === c.ganadorId) {
                      <span class="chip-ganador">
                        <mat-icon aria-hidden="true">emoji_events</mat-icon>{{ r.estado === 'Cerrada' ? 'Elegido' : 'Va adelante' }}
                      </span>
                    }
                  </span>
                  <span class="barra"><span class="relleno" [style.inline-size.%]="pct(cand.votos, c.totalVotos)"></span></span>
                </div>
                <span class="cifra">{{ cand.votos | number }} <small>({{ pct(cand.votos, c.totalVotos) }}%)</small></span>
              </li>
            }
            <li class="blanco">
              <span class="foto-blanco" aria-hidden="true"><mat-icon>check_box_outline_blank</mat-icon></span>
              <div class="datos">
                <span class="nombre">Voto en blanco</span>
                <span class="barra"><span class="relleno" [style.inline-size.%]="pct(c.votosEnBlanco, c.totalVotos)"></span></span>
              </div>
              <span class="cifra">{{ c.votosEnBlanco | number }} <small>({{ pct(c.votosEnBlanco, c.totalVotos) }}%)</small></span>
            </li>
          </ol>

          @if (c.empate) {
            <p class="nota"><mat-icon aria-hidden="true">balance</mat-icon> Hay empate en el primer lugar.</p>
          } @else if (c.ganaVotoEnBlanco) {
            <p class="nota"><mat-icon aria-hidden="true">info</mat-icon> El voto en blanco superó a los candidatos: la elección de este cargo se repite.</p>
          } @else if (c.totalVotos === 0) {
            <p class="nota">Aún no hay votos en esta contienda.</p>
          }
        </section>
      } @empty {
        <p class="vacio">Esta elección no tiene candidatos inscritos.</p>
      }
    } @else {
      <p class="vacio">
        <mat-icon aria-hidden="true">lock_clock</mat-icon>
        El conteo de votos se publica cuando cierre la votación.
      </p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 1rem;
    }

    h3 {
      margin: 0;
      font-size: 1.05rem;
    }

    .total {
      margin: 0.35rem 0 0.75rem;
    }

    .barras {
      display: grid;
      gap: 0.4rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        grid-template-columns: 6.5rem 1fr 4.5rem;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.9rem;
      }
    }

    .barra {
      display: block;
      block-size: 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      overflow: hidden;
    }

    .relleno {
      display: block;
      block-size: 100%;
      background: var(--jv-azul-medio);
      transition: inline-size 0.4s ease;
    }

    .cifra {
      text-align: end;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      small {
        color: var(--jv-texto-suave);
      }
    }

    .contienda header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-block-end: 0.75rem;

      > mat-icon {
        color: var(--jv-azul-medio);
      }

      p {
        margin: 0;
        color: var(--jv-texto-suave);
        font-size: 0.88rem;
      }
    }

    .candidatos {
      display: grid;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.4rem 0.6rem;
        border-radius: var(--jv-radio);
      }

      li.ganador {
        background: #fff8db;

        .relleno {
          background: var(--jv-amarillo);
        }
      }

      li.blanco .relleno {
        background: #9aa4b5;
      }
    }

    .datos {
      display: grid;
      gap: 0.3rem;
      min-inline-size: 0;
    }

    .nombre {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--jv-azul);
    }

    .chip-ganador {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0 0.5rem;
      border-radius: 999px;
      background: var(--jv-amarillo);
      color: var(--jv-azul);
      font-size: 0.75rem;

      mat-icon {
        font-size: 16px;
        inline-size: 16px;
        block-size: 16px;
      }
    }

    .foto-blanco {
      display: inline-grid;
      place-items: center;
      inline-size: 44px;
      block-size: 44px;
      border-radius: 50%;
      background: var(--jv-superficie-suave);
      border: 1px dashed var(--jv-borde);
      color: var(--jv-texto-suave);
    }

    .nota,
    .vacio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.75rem 0 0;
      color: var(--jv-texto-suave);
    }
  `,
})
export class ResultadosEleccionComponent {
  readonly resultados = input.required<Resultados>();

  protected readonly pct = porcentaje;
  protected icono(cargo: Parameters<typeof infoCargo>[0]): string {
    return infoCargo(cargo).icono;
  }
}

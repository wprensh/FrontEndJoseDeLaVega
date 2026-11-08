import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AREAS, LETRAS, ResultadoIntento, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { Barra, BarrasComponent } from '../../../shared/graficos/barras.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Resultado de un simulacro: aciertos, puntaje global estimado (Saber 11), áreas, competencias y revisión. */
@Component({
  selector: 'app-resultado-simulacro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatProgressBarModule, BarrasComponent, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        [titulo]="resultado()?.titulo ?? 'Resultado del simulacro'"
        [subtitulo]="resultado() ? tipos[resultado()!.tipo] : ''"
        icono="insights"
        volverA="/campus/simulacros"
        textoVolver="Simulacros"
      >
        @if (resultado()) {
          <button mat-stroked-button type="button" (click)="imprimir()">
            <mat-icon aria-hidden="true">print</mat-icon>
            Imprimir
          </button>
        }
      </app-encabezado-campus>

      @if (error(); as e) {
        <p class="tarjeta aviso-error" role="alert">{{ e }}</p>
      }

      @if (resultado(); as r) {
        <section class="puntajes">
          <div class="tarjeta destacado">
            <span>Aciertos</span>
            <strong>{{ r.aciertos }} / {{ r.total }}</strong>
            <span>{{ r.porcentaje | number: '1.0-0' }} %</span>
          </div>
          @if (r.global !== null) {
            <div class="tarjeta destacado global">
              <span>Puntaje global estimado</span>
              <strong>{{ r.global }}</strong>
              <span>de 500 puntos</span>
            </div>
          }
          @if (r.entregadoEn) {
            <div class="tarjeta destacado">
              <span>Entregado</span>
              <strong class="fecha">{{ r.entregadoEn | date: 'd MMM y' }}</strong>
              <span>{{ r.entregadoEn | date: 'h:mm a' }}</span>
            </div>
          }
        </section>

        <section class="tarjeta" aria-labelledby="titulo-areas">
          <h2 id="titulo-areas">Por área</h2>
          <app-barras [barras]="barrasArea()" />
        </section>

        @if (r.porCompetencia.length) {
          <section class="tarjeta" aria-labelledby="titulo-competencias">
            <h2 id="titulo-competencias">Por competencia</h2>
            <app-barras [barras]="barrasCompetencia()" />
          </section>
        }

        @if (r.global !== null) {
          <p class="nota">
            El puntaje global se estima como en el ICFES: ((Lectura crítica + Matemáticas + Sociales + Ciencias) × 3 + Inglés) ÷ 13,
            llevado a una escala de 0 a 500. Es una referencia para practicar, no un resultado oficial.
          </p>
        }

        <section class="tarjeta" aria-labelledby="titulo-revision">
          <h2 id="titulo-revision">Revisión de respuestas</h2>
          @if (r.revision; as revision) {
            <ol class="revision">
              @for (q of revision; track q.preguntaId) {
                <li [class.correcta]="q.elegida === q.correcta" [class.incorrecta]="q.elegida !== q.correcta">
                  <p class="meta">
                    Pregunta {{ q.orden }} · {{ areas[q.area] }} ·
                    <strong>{{ q.elegida === q.correcta ? 'Correcta' : q.elegida === null ? 'Sin responder' : 'Incorrecta' }}</strong>
                  </p>
                  @if (q.contexto) {
                    <p class="contexto">{{ q.contexto }}</p>
                  }
                  @if (q.imagenUrl) {
                    <img [src]="q.imagenUrl" alt="Imagen de la pregunta" loading="lazy" />
                  }
                  <p class="enunciado">{{ q.enunciado }}</p>
                  <ul class="opciones">
                    @for (o of q.opciones; track $index) {
                      <li [class.es-correcta]="$index === q.correcta" [class.es-elegida]="$index === q.elegida">
                        <span class="letra">{{ letras[$index] }}</span> {{ o }}
                        @if ($index === q.correcta) {
                          <mat-icon aria-label="Respuesta correcta">check_circle</mat-icon>
                        } @else if ($index === q.elegida) {
                          <mat-icon aria-label="Su respuesta">cancel</mat-icon>
                        }
                      </li>
                    }
                  </ul>
                  @if (q.explicacion) {
                    <p class="explicacion"><strong>Explicación:</strong> {{ q.explicacion }}</p>
                  }
                </li>
              }
            </ol>
          } @else {
            <p class="vacio">{{ r.mensajeRevision ?? 'Las respuestas correctas no se publican para este simulacro.' }}</p>
          }
        </section>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando resultado" />
      }
    </div>
  `,
  styles: `
    section {
      margin-block-end: 1rem;
    }

    h2 {
      margin-block-start: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .puntajes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem;
    }

    .destacado {
      display: grid;
      justify-items: center;
      text-align: center;

      span {
        color: var(--jv-texto-suave);
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 2.2rem;
        line-height: 1.2;
      }

      .fecha {
        font-size: 1.4rem;
      }

      &.global {
        background: var(--jv-azul);

        span {
          color: #dbe4f3;
        }

        strong {
          color: var(--jv-amarillo);
        }
      }
    }

    .nota {
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .revision {
      display: grid;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;

      > li {
        padding: 0.8rem 1rem;
        border: 1px solid var(--jv-borde);
        border-left: 5px solid var(--jv-rojo);
        border-radius: 2px;

        &.correcta {
          border-left-color: #0f7b3f;
        }
      }
    }

    .meta {
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .contexto,
    .enunciado {
      white-space: pre-line;
    }

    .enunciado {
      font-weight: 600;
    }

    img {
      max-inline-size: 100%;
    }

    .opciones {
      display: grid;
      gap: 0.3rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.6rem;
        border-radius: 6px;
      }

      .es-elegida {
        background: #fde2e5;
      }

      .es-correcta {
        background: #e5f5ec;
        font-weight: 600;
      }

      mat-icon {
        margin-inline-start: auto;
      }
    }

    .letra {
      font-weight: 800;
    }

    .explicacion {
      margin-block-end: 0;
      padding: 0.5rem 0.7rem;
      background: var(--jv-superficie-suave);
      border-radius: 6px;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ResultadoSimulacroComponent implements OnInit {
  readonly id = input.required<string>();
  /** ?estudiante= para acudientes. */
  readonly estudiante = input<string>();

  readonly #servicio = inject(CampusAcademicoService);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly areas = AREAS;
  protected readonly letras = LETRAS;
  protected readonly resultado = signal<ResultadoIntento | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly barrasArea = computed<Barra[]>(
    () =>
      this.resultado()?.porArea.map((a) => ({
        etiqueta: AREAS[a.area],
        valor: a.porcentaje,
        texto: `${a.aciertos}/${a.total} · ${Math.round(a.porcentaje)} %`,
      })) ?? [],
  );

  protected readonly barrasCompetencia = computed<Barra[]>(
    () =>
      this.resultado()?.porCompetencia.map((c) => ({
        etiqueta: `${AREAS[c.area]}: ${c.competencia}`,
        valor: c.porcentaje,
        texto: `${c.aciertos}/${c.total}`,
      })) ?? [],
  );

  async ngOnInit(): Promise<void> {
    try {
      this.resultado.set(await this.#servicio.resultadoSimulacro(this.id(), this.estudiante()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected imprimir(): void {
    window.print();
  }
}

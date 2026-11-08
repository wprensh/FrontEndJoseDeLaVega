import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { nombreGrado } from '../../core/models/campus.model';
import { AREAS, LETRAS, ResultadosSimulacro } from '../../core/models/simulacro.model';
import { descargarCsv } from '../../core/utils/csv';
import { Barra, BarrasComponent } from '../graficos/barras.component';

/** Análisis de un simulacro: participación, promedios por área, curso y competencia, preguntas y estudiantes. */
@Component({
  selector: 'app-resultados-simulacro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, MatButtonModule, MatIconModule, BarrasComponent],
  template: `
    @let r = resultados();
    <section class="cifras">
      <div class="tarjeta"><strong>{{ r.presentados }}</strong><span>de {{ r.habilitados }} entregaron</span></div>
      <div class="tarjeta"><strong>{{ r.enCurso }}</strong><span>presentándolo ahora</span></div>
      <div class="tarjeta"><strong>{{ r.promedioPorcentaje | number: '1.0-0' }} %</strong><span>promedio de aciertos</span></div>
      @if (r.promedioGlobal !== null) {
        <div class="tarjeta"><strong>{{ r.promedioGlobal }}</strong><span>puntaje global promedio (de 500)</span></div>
      }
    </section>

    <div class="rejilla">
      <section class="tarjeta">
        <h3>Promedio por área</h3>
        <app-barras [barras]="barrasArea()" />
      </section>
      <section class="tarjeta">
        <h3>Promedio por curso</h3>
        <app-barras [barras]="barrasCurso()" />
      </section>
    </div>

    @if (r.porCompetencia.length) {
      <section class="tarjeta">
        <h3>Por competencia</h3>
        <app-barras [barras]="barrasCompetencia()" />
      </section>
    }

    <section class="tarjeta">
      <h3>Análisis por pregunta</h3>
      <p class="ayuda">Las preguntas con menos del 40 % de aciertos son temas para reforzar en clase.</p>
      <div class="tabla">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Área</th>
              <th scope="col" class="enunciado">Pregunta</th>
              <th scope="col">Correcta</th>
              <th scope="col">Aciertos</th>
              <th scope="col">Respuestas (A, B, C...)</th>
            </tr>
          </thead>
          <tbody>
            @for (p of r.porPregunta; track p.preguntaId) {
              <tr [class.debil]="p.porcentajeAcierto < 40">
                <td>{{ p.orden }}</td>
                <td>{{ areas[p.area] }}</td>
                <td class="enunciado">{{ p.enunciado }}</td>
                <td>{{ letras[p.correcta] }}</td>
                <td><strong>{{ p.porcentajeAcierto | number: '1.0-0' }} %</strong></td>
                <td>
                  @for (d of p.distribucion; track $index) {
                    <span class="dist" [class.ok]="$index === p.correcta">{{ letras[$index] }}: {{ d }}</span>
                  }
                  @if (p.sinResponder) {
                    <span class="dist">—: {{ p.sinResponder }}</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="tarjeta">
      <div class="barra">
        <h3>Estudiantes</h3>
        <button mat-stroked-button type="button" (click)="exportar()">
          <mat-icon aria-hidden="true">download</mat-icon>
          Descargar Excel (CSV)
        </button>
      </div>
      <div class="tabla">
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col" class="enunciado">Estudiante</th>
              <th scope="col">Curso</th>
              @for (a of r.porArea; track a.area) {
                <th scope="col">{{ areas[a.area] }}</th>
              }
              <th scope="col">Aciertos</th>
              @if (r.promedioGlobal !== null) {
                <th scope="col">Global</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (e of r.estudiantes; track e.estudianteId; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td class="enunciado">{{ e.nombreCompleto }}</td>
                <td>{{ curso(e.grado, e.grupo) }}</td>
                @for (a of r.porArea; track a.area) {
                  <td>{{ porcentajeArea(e.porArea, a.area) }}</td>
                }
                <td><strong>{{ e.aciertos }}/{{ e.total }}</strong></td>
                @if (r.promedioGlobal !== null) {
                  <td><strong>{{ e.global ?? '—' }}</strong></td>
                }
              </tr>
            } @empty {
              <tr><td colspan="8" class="vacio">Nadie lo ha entregado todavía.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 1rem;
    }

    h3 {
      margin: 0 0 0.75rem;
      color: var(--jv-azul);
      font-size: 1.05rem;
    }

    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 1rem;

      div {
        display: grid;
        text-align: center;
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.8rem;
      }

      span {
        color: var(--jv-texto-suave);
        font-size: 0.9rem;
      }
    }

    .rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }

    .ayuda {
      margin-block-start: -0.4rem;
      color: var(--jv-texto-suave);
      font-size: 0.88rem;
    }

    .barra {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tabla {
      overflow-x: auto;
    }

    table {
      inline-size: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th,
    td {
      padding: 0.45rem 0.5rem;
      border-block-end: 1px solid var(--jv-borde);
      text-align: center;
      white-space: nowrap;
    }

    .enunciado {
      max-inline-size: 28rem;
      overflow: hidden;
      text-align: start;
      text-overflow: ellipsis;
    }

    .debil {
      background: #fff1f2;
    }

    .dist {
      display: inline-block;
      margin-inline-end: 0.4rem;
      color: var(--jv-texto-suave);

      &.ok {
        color: #0f7b3f;
        font-weight: 700;
      }
    }

    .vacio {
      padding: 1.5rem;
      color: var(--jv-texto-suave);
    }
  `,
})
export class ResultadosSimulacroComponent {
  readonly resultados = input.required<ResultadosSimulacro>();

  protected readonly areas = AREAS;
  protected readonly letras = LETRAS;

  protected readonly barrasArea = computed<Barra[]>(() =>
    this.resultados().porArea.map((a) => ({ etiqueta: AREAS[a.area], valor: a.promedio })),
  );

  protected readonly barrasCurso = computed<Barra[]>(() =>
    this.resultados().porCurso.map((c) => ({
      etiqueta: this.curso(c.grado, c.grupo),
      valor: c.promedio,
      texto: `${Math.round(c.promedio)} %${c.promedioGlobal !== null ? ' · ' + c.promedioGlobal : ''} (${c.presentados})`,
    })),
  );

  protected readonly barrasCompetencia = computed<Barra[]>(() =>
    this.resultados().porCompetencia.map((c) => ({ etiqueta: `${AREAS[c.area]}: ${c.competencia}`, valor: c.promedio })),
  );

  protected curso(grado: number, grupo: string | null): string {
    return [nombreGrado(grado), grupo].filter(Boolean).join(' ');
  }

  protected porcentajeArea(porArea: readonly { area: string; porcentaje: number }[], area: string): string {
    const valor = porArea.find((a) => a.area === area)?.porcentaje;
    return valor === undefined ? '—' : `${Math.round(valor)} %`;
  }

  protected exportar(): void {
    const r = this.resultados();
    const areas = r.porArea.map((a) => a.area);
    descargarCsv(
      `simulacro-${r.simulacro.titulo.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`,
      ['Estudiante', 'Curso', ...areas.map((a) => AREAS[a]), 'Aciertos', 'Total', 'Porcentaje', 'Global'],
      r.estudiantes.map((e) => [
        e.nombreCompleto,
        this.curso(e.grado, e.grupo),
        ...areas.map((a) => Math.round(e.porArea.find((x) => x.area === a)?.porcentaje ?? 0)),
        e.aciertos,
        e.total,
        Math.round(e.porcentaje),
        e.global ?? '',
      ]),
    );
  }
}

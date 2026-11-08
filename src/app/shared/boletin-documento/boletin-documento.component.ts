import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { INSTITUCION } from '../../core/institucion';
import { Boletin, DESEMPENOS, NOTA_APROBATORIA, formatoNota } from '../../core/models/academico.model';
import { nombreGrado } from '../../core/models/campus.model';
import { EscudoComponent } from '../escudo/escudo.component';

/** Clase del <body> que deja visibles solo los boletines al imprimir (ver styles.scss). */
export const CLASE_IMPRESION_BOLETIN = 'imprimiendo-boletin';

/** Imprime solo los boletines de la página (el navegador también permite guardarlos como PDF). */
export function imprimirBoletines(): void {
  document.body.classList.add(CLASE_IMPRESION_BOLETIN);
  window.addEventListener('afterprint', () => document.body.classList.remove(CLASE_IMPRESION_BOLETIN), { once: true });
  window.print();
}

/**
 * Boletín de calificaciones de un periodo con membrete, escala del Decreto 1290, notas de los periodos
 * anteriores, nota acumulada, fallas, observaciones, promedio y puesto. Una hoja carta por estudiante.
 */
@Component({
  selector: 'app-boletin-documento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EscudoComponent],
  template: `
    @let b = boletin();
    <article class="hoja" [attr.aria-label]="'Boletín de ' + b.estudiante.nombreCompleto">
      <header class="membrete">
        <app-escudo [tamano]="70" />
        <div>
          <p class="nombre">{{ institucion.nombre }}</p>
          <p>DANE {{ institucion.membrete.codigoDane }} · NIT {{ institucion.membrete.nit }}</p>
          <p>{{ institucion.ciudad }} – {{ institucion.departamento }}</p>
        </div>
        <div class="titulo-doc">
          <strong>INFORME ACADÉMICO</strong>
          <span>{{ b.periodo.nombre }}</span>
        </div>
      </header>

      <dl class="datos">
        <div><dt>Estudiante</dt><dd>{{ b.estudiante.nombreCompleto }}</dd></div>
        <div><dt>Documento</dt><dd>{{ b.estudiante.documento }}</dd></div>
        <div><dt>Curso</dt><dd>{{ curso() }}</dd></div>
        <div><dt>Año lectivo</dt><dd>{{ b.periodo.anio }}</dd></div>
      </dl>

      <table>
        <thead>
          <tr>
            <th scope="col" class="asignatura">Área / Asignatura</th>
            <th scope="col" title="Intensidad horaria semanal">IH</th>
            @for (p of b.periodos; track p.id) {
              <th scope="col" [title]="p.nombre + ' (' + p.porcentaje + ' %)'">P{{ p.numero }}</th>
            }
            <th scope="col">Acum.</th>
            <th scope="col">Desempeño</th>
            <th scope="col">Fallas</th>
          </tr>
        </thead>
        <tbody>
          @for (area of b.areas; track area.area) {
            <tr class="fila-area">
              <th scope="colgroup" [attr.colspan]="5 + b.periodos.length">{{ area.area }}</th>
            </tr>
            @for (a of area.asignaturas; track a.asignaturaId) {
              <tr>
                <th scope="row" class="asignatura">
                  {{ a.nombre }}
                  @if (a.docente) {
                    <span class="docente">{{ a.docente }}</span>
                  }
                  @if (a.observacion) {
                    <span class="observacion">{{ a.observacion }}</span>
                  }
                </th>
                <td>{{ a.intensidadHoraria ?? '' }}</td>
                @for (n of a.notasPeriodos; track $index) {
                  <td [class.perdida]="n !== null && n < aprobatoria" [class.actual]="b.periodos[$index].id === b.periodo.id">
                    {{ formato(n) }}
                  </td>
                }
                <td [class.perdida]="a.acumulada !== null && a.acumulada < aprobatoria">{{ formato(a.acumulada) }}</td>
                <td class="desempeno" [attr.data-desempeno]="a.desempeno">{{ a.desempeno ? desempenos[a.desempeno] : '—' }}</td>
                <td>{{ a.fallas || '' }}</td>
              </tr>
            }
          } @empty {
            <tr><td [attr.colspan]="5 + b.periodos.length" class="vacio">Aún no hay notas registradas en este periodo.</td></tr>
          }
        </tbody>
      </table>

      <section class="resumen">
        <div><span>Promedio del periodo</span><strong>{{ formato(b.promedio) }}</strong></div>
        <div><span>Desempeño general</span><strong>{{ b.desempenoGeneral ? desempenos[b.desempenoGeneral] : '—' }}</strong></div>
        <div><span>Puesto en el curso</span><strong>{{ b.puesto ? b.puesto + ' de ' + b.totalCurso : '—' }}</strong></div>
        <div><span>Fallas del periodo</span><strong>{{ b.fallasTotales }}</strong></div>
        <div [class.alerta]="b.asignaturasPerdidas > 0">
          <span>Asignaturas en desempeño bajo</span><strong>{{ b.asignaturasPerdidas }}</strong>
        </div>
      </section>

      <p class="escala">
        Escala de valoración (Decreto 1290 de 2009): Superior 4,6 – 5,0 · Alto 4,0 – 4,5 · Básico 3,0 – 3,9 · Bajo 1,0 – 2,9.
      </p>

      <footer class="firmas">
        <div><span class="linea"></span>Director(a) de grupo</div>
        <div><span class="linea"></span>{{ institucion.rectoria.nombre }}<br />{{ institucion.rectoria.cargo }}</div>
      </footer>
      <p class="generado">Generado el {{ b.generadoEn | date: "d 'de' MMMM 'de' y, h:mm a" }} desde el campus virtual.</p>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .hoja {
      max-inline-size: 216mm;
      margin-inline: auto;
      padding: clamp(1rem, 3vw, 2.2rem);
      background: #fff;
      color: #111;
      border: 1px solid var(--jv-borde);
      box-shadow: var(--jv-sombra);
      font-size: 0.86rem;
    }

    .membrete {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding-block-end: 0.6rem;
      border-block-end: 3px double var(--jv-azul);

      p {
        margin: 0;
        line-height: 1.3;
      }

      .nombre {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-weight: 800;
        font-size: 1.05rem;
        text-transform: uppercase;
      }
    }

    .titulo-doc {
      display: grid;
      margin-inline-start: auto;
      text-align: end;

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
      }
    }

    .datos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.3rem 1rem;
      margin: 0.8rem 0;

      div {
        display: grid;
      }

      dt {
        color: #555;
        font-size: 0.75rem;
        text-transform: uppercase;
      }

      dd {
        margin: 0;
        font-weight: 700;
      }
    }

    table {
      inline-size: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.3rem 0.4rem;
      border: 1px solid #c9d1de;
      text-align: center;
    }

    thead th {
      background: var(--jv-azul);
      color: #fff;
      font-size: 0.78rem;
    }

    .asignatura {
      text-align: start;
      font-weight: 600;
    }

    .docente,
    .observacion {
      display: block;
      font-weight: 400;
      font-size: 0.75rem;
      color: #555;
    }

    .observacion {
      font-style: italic;
    }

    .fila-area th {
      background: #eef2f8;
      color: var(--jv-azul);
      text-align: start;
      font-size: 0.78rem;
      text-transform: uppercase;
    }

    .actual {
      font-weight: 700;
    }

    .perdida {
      color: var(--jv-rojo);
      font-weight: 700;
    }

    .desempeno[data-desempeno='Bajo'] {
      color: var(--jv-rojo);
      font-weight: 700;
    }

    .desempeno[data-desempeno='Superior'] {
      color: #0f7b3f;
      font-weight: 700;
    }

    .vacio {
      padding: 1.5rem;
      color: #555;
    }

    .resumen {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.5rem;
      margin-block: 0.9rem;

      div {
        display: grid;
        padding: 0.45rem 0.6rem;
        border: 1px solid #c9d1de;
        border-radius: 4px;
      }

      span {
        font-size: 0.72rem;
        color: #555;
      }

      strong {
        font-size: 1.05rem;
        color: var(--jv-azul);
      }

      .alerta strong {
        color: var(--jv-rojo);
      }
    }

    .escala {
      margin: 0;
      font-size: 0.74rem;
      color: #555;
    }

    .firmas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      margin-block-start: 2.6rem;
      text-align: center;
      font-size: 0.8rem;

      .linea {
        display: block;
        margin-block-end: 0.3rem;
        border-block-start: 1px solid #333;
      }
    }

    .generado {
      margin: 1rem 0 0;
      font-size: 0.7rem;
      color: #777;
      text-align: center;
    }

    @media print {
      .hoja {
        max-inline-size: none;
        padding: 0;
        border: none;
        box-shadow: none;
        font-size: 9.5pt;
        break-after: page;
      }

      thead th {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `,
})
export class BoletinDocumentoComponent {
  readonly boletin = input.required<Boletin>();

  protected readonly institucion = INSTITUCION;
  protected readonly desempenos = DESEMPENOS;
  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly formato = formatoNota;

  protected readonly curso = computed(() => {
    const e = this.boletin().estudiante;
    return [nombreGrado(e.grado), e.grupo].filter(Boolean).join(' ');
  });
}

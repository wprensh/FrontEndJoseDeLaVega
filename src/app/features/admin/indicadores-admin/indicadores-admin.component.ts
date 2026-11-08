import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { ESTADOS_CASO, NOTA_APROBATORIA, TIPOS_ANOTACION, formatoNota } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_ADMISION, Tablero } from '../../../core/models/comunicaciones.model';
import { AREAS, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { Barra, BarrasComponent } from '../../../shared/graficos/barras.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/** Tablero del rector: la institución en una sola vista. */
@Component({
  selector: 'app-indicadores-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    BarraAdminComponent,
    BarrasComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Tablero del rector"
        subtitulo="Matrícula, asistencia, rendimiento, convivencia, simulacros y comunicaciones en una vista"
        etiqueta="Panel administrativo"
      />
      <app-barra-admin />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      @if (!tablero() && !error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando indicadores" />
      }

      @if (tablero(); as t) {
        <div class="encabezado">
          <p>Corte al {{ t.fecha | date: "EEEE d 'de' MMMM 'de' y" }}@if (t.academico.periodo) { · {{ t.academico.periodo.nombre }}}</p>
          <button mat-button type="button" (click)="cargar()">
            <mat-icon aria-hidden="true">refresh</mat-icon>
            Actualizar
          </button>
          <button mat-button type="button" class="no-imprimir" (click)="imprimir()">
            <mat-icon aria-hidden="true">print</mat-icon>
            Imprimir
          </button>
        </div>

        <section class="cifras">
          <div class="tarjeta cifra">
            <mat-icon aria-hidden="true">school</mat-icon>
            <strong>{{ t.comunidad.estudiantes | number }}</strong>
            <span>estudiantes · {{ t.comunidad.docentes }} docentes</span>
          </div>
          <div class="tarjeta cifra">
            <mat-icon aria-hidden="true">family_restroom</mat-icon>
            <strong>{{ porcentaje(t.comunidad.estudiantesConAcudiente, t.comunidad.estudiantes) | number: '1.0-0' }} %</strong>
            <span>con acudiente en el campus ({{ t.comunidad.acudientes }} acudientes)</span>
          </div>
          <div class="tarjeta cifra" [class.alerta]="(t.asistencia.porcentajeHoy ?? 100) < 90">
            <mat-icon aria-hidden="true">how_to_reg</mat-icon>
            <strong>{{ t.asistencia.porcentajeHoy === null ? '—' : (t.asistencia.porcentajeHoy | number: '1.0-1') + ' %' }}</strong>
            <span>asistencia hoy · {{ t.asistencia.ausenciasHoy }} ausencias, {{ t.asistencia.tardesHoy }} tardes</span>
          </div>
          <div class="tarjeta cifra">
            <mat-icon aria-hidden="true">insights</mat-icon>
            <strong>{{ formato(t.academico.promedioGeneral) }}</strong>
            <span>promedio general del periodo</span>
          </div>
          <div class="tarjeta cifra" [class.alerta]="t.academico.estudiantesConPerdidas > 0">
            <mat-icon aria-hidden="true">warning</mat-icon>
            <strong>{{ t.academico.estudiantesConPerdidas }}</strong>
            <span>estudiantes con asignaturas en bajo</span>
          </div>
          <div class="tarjeta cifra" [class.alerta]="t.convivencia.casosAbiertos > 0">
            <mat-icon aria-hidden="true">gavel</mat-icon>
            <strong>{{ t.convivencia.casosAbiertos }}</strong>
            <span>casos de convivencia abiertos</span>
          </div>
        </section>

        <div class="rejilla">
          <section class="tarjeta">
            <h2>Rendimiento por grado</h2>
            <p class="detalle">
              Promedio del periodo (1 a 5).
              @if (t.academico.porcentajeAprobacion !== null) {
                Aprobación: <strong>{{ t.academico.porcentajeAprobacion | number: '1.0-0' }} %</strong> de {{ t.academico.notasRegistradas }} notas.
              }
            </p>
            <app-barras [barras]="barrasPromedioGrado()" [maximo]="5" [umbral]="aprobatoria" [meta]="4" sufijo="" decimales="1.1-1" />
          </section>
          <section class="tarjeta">
            <h2>Rendimiento por área</h2>
            <p class="detalle">Áreas ordenadas de menor a mayor promedio.</p>
            <app-barras [barras]="barrasPromedioArea()" [maximo]="5" [umbral]="aprobatoria" [meta]="4" sufijo="" decimales="1.1-1" />
          </section>
          <section class="tarjeta">
            <h2>Asistencia por grado</h2>
            <p class="detalle">
              Últimos 30 días.
              @if (t.asistencia.porcentaje30Dias !== null) {
                Promedio institucional: <strong>{{ t.asistencia.porcentaje30Dias | number: '1.0-1' }} %</strong>.
              }
            </p>
            <app-barras [barras]="barrasAsistencia()" [umbral]="85" [meta]="93" decimales="1.0-1" />
          </section>
          <section class="tarjeta">
            <h2>Más ausencias (30 días)</h2>
            <ol class="lista">
              @for (e of t.asistencia.masAusencias; track e.estudianteId) {
                <li>
                  <span>{{ e.nombreCompleto }}<span class="detalle">{{ e.curso }}</span></span>
                  <strong>{{ e.ausencias }}</strong>
                </li>
              } @empty {
                <li class="vacio">Sin ausencias registradas.</li>
              }
            </ol>
          </section>

          <section class="tarjeta">
            <h2>Convivencia</h2>
            <p class="detalle">{{ t.convivencia.anotacionesUltimos30Dias }} anotaciones en los últimos 30 días.</p>
            <ul class="chips">
              @for (c of t.convivencia.abiertosPorTipo; track c.tipo) {
                <li [attr.data-tipo]="c.tipo">{{ tiposAnotacion[c.tipo] }}: <strong>{{ c.total }}</strong></li>
              }
            </ul>
            @if (t.convivencia.casosGraves.length) {
              <h3>Casos tipo II y III abiertos</h3>
              <ul class="lista">
                @for (c of t.convivencia.casosGraves; track c.id) {
                  <li>
                    <span>{{ c.estudiante }}<span class="detalle">{{ c.curso }} · {{ tiposAnotacion[c.tipo] }} · {{ c.fecha | date: 'd MMM' }}</span></span>
                    <span class="estado">{{ estadosCaso[c.estado] }}</span>
                  </li>
                }
              </ul>
            }
            @if (sesion.puede('Convivencia', 'Ver')) {
              <a mat-button routerLink="/admin/convivencia">Ir a convivencia</a>
            }
          </section>

          <section class="tarjeta">
            <h2>Último simulacro</h2>
            @if (t.ultimoSimulacro; as s) {
              <p>
                <strong>{{ s.titulo }}</strong> · {{ tiposPrueba[s.tipo] }}
                <span class="detalle">
                  {{ s.presentados }} de {{ s.habilitados }} lo presentaron · {{ s.promedioPorcentaje | number: '1.0-0' }} % de aciertos
                  @if (s.promedioGlobal !== null) {
                    · global promedio {{ s.promedioGlobal }}/500
                  }
                </span>
              </p>
              <app-barras [barras]="barrasSimulacro()" />
              @if (sesion.puede('Simulacros', 'Ver')) {
                <a mat-button [routerLink]="['/admin/simulacros', s.id]">Ver análisis completo</a>
              }
            } @else {
              <p class="vacio">Aún no se ha presentado ningún simulacro.</p>
            }
          </section>

          <section class="tarjeta">
            <h2>Admisiones {{ t.admisiones.anioLectivo }}</h2>
            <p class="detalle"><strong>{{ t.admisiones.porRevisar }}</strong> solicitudes esperan revisión.</p>
            <ul class="lista">
              @for (a of t.admisiones.porEstado; track a.estado) {
                <li><span>{{ estadosAdmision[a.estado] }}</span><strong>{{ a.total }}</strong></li>
              } @empty {
                <li class="vacio">Sin solicitudes.</li>
              }
            </ul>
            @if (sesion.puede('Admisiones', 'Ver')) {
              <a mat-button routerLink="/admin/admisiones">Ir a admisiones</a>
            }
          </section>

          <section class="tarjeta">
            <h2>Matrícula por grado</h2>
            <app-barras [barras]="barrasMatricula()" [maximo]="maximoMatricula()" [umbral]="0" [meta]="0" sufijo="" />
          </section>

          <section class="tarjeta">
            <h2>Última circular</h2>
            @if (t.ultimaCircular; as c) {
              <p><strong>{{ c.codigo }}</strong> {{ c.titulo }}</p>
              <app-barras [barras]="barrasCircular()" [umbral]="50" [meta]="80" />
              @if (sesion.puede('Comunicaciones', 'Ver')) {
                <a mat-button routerLink="/admin/comunicaciones">Ver pendientes</a>
              }
            } @else {
              <p class="vacio">Aún no se ha publicado ninguna circular.</p>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .encabezado {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-block-end: 0.75rem;

      p {
        flex: 1;
        margin: 0;
        color: var(--jv-texto-suave);
      }
    }

    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.75rem;
      margin-block-end: 1rem;
    }

    .cifra {
      display: grid;
      gap: 0.15rem;

      mat-icon {
        color: var(--jv-azul);
      }

      strong {
        color: var(--jv-azul);
        font: 800 1.8rem / 1.1 var(--jv-fuente-titulos);
      }

      span {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
      }

      &.alerta {
        border-color: #f2b8b8;

        mat-icon,
        strong {
          color: var(--jv-rojo);
        }
      }
    }

    .rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }

    h2 {
      margin: 0 0 0.3rem;
      color: var(--jv-azul);
      font-size: 1.05rem;
    }

    h3 {
      margin: 0.8rem 0 0.3rem;
      font-size: 0.95rem;
    }

    .detalle {
      display: block;
      margin: 0 0 0.6rem;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .lista {
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding-block: 0.35rem;
        border-block-end: 1px solid var(--jv-borde);
      }

      .detalle {
        margin: 0;
      }
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        background: var(--jv-superficie-suave);
        border: 1px solid var(--jv-borde);
        font-size: 0.85rem;
      }

      [data-tipo='SituacionTipoII'],
      [data-tipo='SituacionTipoIII'] {
        background: #fdecec;
        border-color: #f2b8b8;
      }
    }

    .estado {
      flex: none;
      font-size: 0.8rem;
      color: var(--jv-texto-suave);
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class IndicadoresAdminComponent {
  readonly #servicio = inject(AcademicoAdminService);
  protected readonly sesion = inject(SesionService);

  protected readonly tablero = signal<Tablero | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formato = formatoNota;
  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly tiposAnotacion = TIPOS_ANOTACION;
  protected readonly estadosCaso = ESTADOS_CASO;
  protected readonly estadosAdmision = ESTADOS_ADMISION;
  protected readonly tiposPrueba = TIPOS_PRUEBA;

  protected readonly barrasPromedioGrado = computed<Barra[]>(
    () => this.tablero()?.academico.porGrado.map((g) => ({ etiqueta: nombreGrado(g.grado), valor: g.promedio })) ?? [],
  );
  protected readonly barrasPromedioArea = computed<Barra[]>(() =>
    [...(this.tablero()?.academico.porArea ?? [])]
      .sort((a, b) => a.promedio - b.promedio)
      .map((a) => ({ etiqueta: a.area, valor: a.promedio })),
  );
  protected readonly barrasAsistencia = computed<Barra[]>(
    () => this.tablero()?.asistencia.porGrado.map((g) => ({ etiqueta: nombreGrado(g.grado), valor: g.porcentaje })) ?? [],
  );
  protected readonly barrasSimulacro = computed<Barra[]>(
    () => this.tablero()?.ultimoSimulacro?.porArea.map((a) => ({ etiqueta: AREAS[a.area], valor: a.promedio })) ?? [],
  );
  protected readonly barrasMatricula = computed<Barra[]>(
    () =>
      this.tablero()?.comunidad.porGrado.map((g) => ({
        etiqueta: nombreGrado(g.grado),
        valor: g.total,
        texto: String(g.total),
      })) ?? [],
  );
  protected readonly maximoMatricula = computed(() => Math.max(1, ...this.barrasMatricula().map((b) => b.valor)));
  protected readonly barrasCircular = computed<Barra[]>(() => {
    const c = this.tablero()?.ultimaCircular;
    if (!c) {
      return [];
    }
    const barras: Barra[] = [
      { etiqueta: 'Leída', valor: this.porcentaje(c.leidas, c.destinatarios), texto: `${c.leidas} de ${c.destinatarios}` },
    ];
    if (c.requiereConfirmacion) {
      barras.push({
        etiqueta: 'Enterados',
        valor: this.porcentaje(c.confirmadas, c.destinatarios),
        texto: `${c.confirmadas} de ${c.destinatarios}`,
      });
    }
    return barras;
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.error.set(null);
    try {
      this.tablero.set(await this.#servicio.tablero());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected porcentaje(parte: number, total: number): number {
    return total ? (parte * 100) / total : 0;
  }

  protected imprimir(): void {
    window.print();
  }
}

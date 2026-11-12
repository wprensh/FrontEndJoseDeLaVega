import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Asignatura } from '../../../core/models/academico.model';
import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_PLANEACION, EstadoPlaneacion, GuardarPlanEstudios, PlanEstudios, Planeacion } from '../../../core/models/mejoras.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { PanelMejorasService } from '../../../core/services/mejoras.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { TONO_PLANEACION } from '../../campus/planeador/planeador.component';

type CamposPlan = Omit<GuardarPlanEstudios, 'asignaturaId' | 'grado' | 'periodo'>;

const CAMPOS: readonly { readonly clave: keyof CamposPlan; readonly etiqueta: string }[] = [
  { clave: 'estandares', etiqueta: 'Estándares básicos de competencia' },
  { clave: 'dba', etiqueta: 'Derechos básicos de aprendizaje (DBA)' },
  { clave: 'competencias', etiqueta: 'Competencias' },
  { clave: 'contenidos', etiqueta: 'Contenidos / ejes temáticos' },
  { clave: 'indicadores', etiqueta: 'Indicadores de desempeño' },
];

/**
 * Planeación académica: coordinación carga el plan de estudios (malla) por asignatura, grado y periodo, y
 * revisa las planeaciones semanales que envían los docentes (aprobar o devolver con observaciones).
 */
@Component({
  selector: 'app-planeacion-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Planeación académica"
        subtitulo="Plan de estudios con estándares y DBA, y revisión de las planeaciones de clase de los docentes"
        etiqueta="Panel administrativo"
      />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      <mat-tab-group class="tarjeta" animationDuration="0ms" mat-stretch-tabs="false">
        <mat-tab label="Revisión de planeaciones">
          <div class="barra-filtros pestana">
            <mat-form-field>
              <mat-label>Estado</mat-label>
              <mat-select [(ngModel)]="estado" (ngModelChange)="cargarPlaneaciones()">
                <mat-option [value]="null">Todas</mat-option>
                @for (e of estadosLista; track e[0]) {
                  <mat-option [value]="e[0]">{{ e[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          @if (planeaciones(); as lista) {
            <div class="lista-planeaciones">
              @for (p of lista; track p.id) {
                <article class="planeacion">
                  <header>
                    <div>
                      <h3>{{ p.tema }}</h3>
                      <p class="texto-suave">
                        {{ p.docente }} · {{ p.asignatura }} {{ grado(p.grado) }} {{ p.grupo ?? '' }} · semana del {{ p.semana | date: 'd MMM y' }}
                      </p>
                    </div>
                    <span class="etiqueta-estado" [attr.data-tono]="tonos[p.estado]">{{ estados[p.estado] }}</span>
                  </header>
                  <dl>
                    @if (p.aprendizajes) { <dt>Aprendizajes</dt><dd class="pre-linea">{{ p.aprendizajes }}</dd> }
                    @if (p.actividades) { <dt>Actividades</dt><dd class="pre-linea">{{ p.actividades }}</dd> }
                    @if (p.recursos) { <dt>Recursos</dt><dd class="pre-linea">{{ p.recursos }}</dd> }
                    @if (p.evaluacion) { <dt>Evaluación</dt><dd class="pre-linea">{{ p.evaluacion }}</dd> }
                  </dl>
                  @if (p.observacion) {
                    <p class="texto-suave">Observación: {{ p.observacion }} ({{ p.revisadaPor }})</p>
                  }
                  @if (p.estado === 'Enviada' && puedeRevisar) {
                    <div class="acciones-fila">
                      <mat-form-field class="observacion">
                        <mat-label>Observación para el docente</mat-label>
                        <input matInput maxlength="1000" [(ngModel)]="observaciones[p.id]" />
                      </mat-form-field>
                      <button mat-stroked-button type="button" (click)="revisar(p, false)">Devolver</button>
                      <button mat-flat-button class="boton-azul" type="button" (click)="revisar(p, true)">Aprobar</button>
                    </div>
                  }
                </article>
              } @empty {
                <p class="texto-suave">No hay planeaciones {{ estado ? 'en estado "' + estados[estado] + '"' : '' }}.</p>
              }
            </div>
          } @else {
            <mat-progress-bar mode="indeterminate" aria-label="Cargando planeaciones" />
          }
        </mat-tab>

        <mat-tab label="Plan de estudios (malla)">
          <div class="barra-filtros pestana">
            <mat-form-field>
              <mat-label>Asignatura</mat-label>
              <mat-select [(ngModel)]="asignaturaId" (ngModelChange)="cargarPlanes()">
                <mat-option [value]="null">Todas</mat-option>
                @for (a of asignaturas(); track a.id) {
                  <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Grado</mat-label>
              <mat-select [(ngModel)]="gradoFiltro" (ngModelChange)="cargarPlanes()">
                <mat-option [value]="null">Todos</mat-option>
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ grado(g) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (puedeEditar) {
              <button mat-flat-button class="boton-azul" type="button" (click)="nuevoPlan()">
                <mat-icon aria-hidden="true">add</mat-icon> Agregar periodo a la malla
              </button>
            }
          </div>

          @if (plan(); as p) {
            <form class="editor-plan" (ngSubmit)="guardarPlan()">
              <div class="formulario-rejilla">
                <mat-form-field>
                  <mat-label>Asignatura</mat-label>
                  <mat-select name="asignatura" [(ngModel)]="p.asignaturaId" required>
                    @for (a of asignaturas(); track a.id) {
                      <mat-option [value]="a.id">{{ a.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Grado</mat-label>
                  <mat-select name="grado" [(ngModel)]="p.grado">
                    @for (g of grados; track g) {
                      <mat-option [value]="g">{{ grado(g) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Periodo</mat-label>
                  <mat-select name="periodo" [(ngModel)]="p.periodo">
                    @for (n of [1, 2, 3, 4]; track n) {
                      <mat-option [value]="n">Periodo {{ n }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @for (c of campos; track c.clave) {
                  <mat-form-field class="ancho-completo">
                    <mat-label>{{ c.etiqueta }}</mat-label>
                    <textarea matInput rows="3" maxlength="4000" [name]="c.clave" [(ngModel)]="p[c.clave]"></textarea>
                  </mat-form-field>
                }
              </div>
              <div class="acciones-fila">
                <button mat-button type="button" (click)="plan.set(null)">Cancelar</button>
                <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">Guardar</button>
              </div>
            </form>
          }

          <div class="tabla-desplazable">
            <table class="tabla-datos">
              <thead>
                <tr><th scope="col">Asignatura</th><th scope="col">Grado</th><th scope="col">Periodo</th><th scope="col">Estándares / DBA</th><th scope="col"></th></tr>
              </thead>
              <tbody>
                @for (m of planes(); track m.id) {
                  <tr>
                    <td>{{ m.asignatura }}<br /><small class="texto-suave">{{ m.area }}</small></td>
                    <td>{{ grado(m.grado) }}</td>
                    <td>{{ m.periodo }}</td>
                    <td class="resumen">{{ m.estandares ?? m.dba ?? m.contenidos ?? '—' }}</td>
                    <td class="acciones-fila">
                      @if (puedeEditar) {
                        <button mat-button type="button" (click)="editarPlan(m)">Editar</button>
                        <button mat-button type="button" (click)="eliminarPlan(m)">Eliminar</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="texto-suave">No hay malla cargada con esos filtros.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .pestana {
      margin-block: 1rem;
    }

    .lista-planeaciones {
      display: grid;
      gap: 1rem;
    }

    .planeacion {
      padding: 1rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);

      header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      h3 {
        margin: 0;
        color: var(--jv-azul);
      }

      p {
        margin: 0.2rem 0;
      }

      dt {
        margin-block-start: 0.5rem;
        color: var(--jv-azul-medio);
        font-weight: 600;
      }

      dd {
        margin: 0;
      }
    }

    .observacion {
      flex: 1 1 280px;
    }

    .editor-plan {
      margin-block-end: 1rem;
      padding: 1rem;
      background: var(--jv-superficie-suave);
      border-radius: var(--jv-radio);
    }

    .resumen {
      max-inline-size: 40ch;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  `,
})
export class PlaneacionAdminComponent implements OnInit {
  readonly #servicio = inject(PanelMejorasService);
  readonly #academico = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #sesion = inject(SesionService);

  protected readonly planeaciones = signal<Planeacion[] | null>(null);
  protected readonly planes = signal<PlanEstudios[]>([]);
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly plan = signal<GuardarPlanEstudios | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly estados = ESTADOS_PLANEACION;
  protected readonly estadosLista = Object.entries(ESTADOS_PLANEACION) as [EstadoPlaneacion, string][];
  protected readonly tonos = TONO_PLANEACION;
  protected readonly grados = GRADOS;
  protected readonly grado = nombreGrado;
  protected readonly campos = CAMPOS;
  protected readonly puedeRevisar = this.#sesion.puede('Planeacion', 'Editar');
  protected readonly puedeEditar = this.#sesion.puede('Planeacion', 'Editar');
  protected readonly observaciones: Record<string, string> = {};
  protected estado: EstadoPlaneacion | null = 'Enviada';
  protected asignaturaId: string | null = null;
  protected gradoFiltro: number | null = null;

  async ngOnInit(): Promise<void> {
    this.#academico
      .asignaturas()
      .then((a) => this.asignaturas.set(a.filter((x) => x.activa)))
      .catch(() => undefined);
    await Promise.all([this.cargarPlaneaciones(), this.cargarPlanes()]);
  }

  protected async cargarPlaneaciones(): Promise<void> {
    try {
      this.planeaciones.set(await this.#servicio.planeaciones({ estado: this.estado }));
    } catch (error) {
      this.error.set(mensajeDeError(error));
      this.planeaciones.set([]);
    }
  }

  protected async cargarPlanes(): Promise<void> {
    try {
      this.planes.set(await this.#servicio.planes({ asignaturaId: this.asignaturaId, grado: this.gradoFiltro }));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected async revisar(p: Planeacion, aprobar: boolean): Promise<void> {
    const observacion = this.observaciones[p.id]?.trim() || null;
    if (!aprobar && !observacion) {
      this.#snackBar.open('Escriba la observación para devolverla al docente.', 'Cerrar');
      return;
    }
    try {
      const revisada = await this.#servicio.revisarPlaneacion(p.id, aprobar, observacion);
      this.planeaciones.update((l) => (l ?? []).map((x) => (x.id === p.id ? revisada : x)));
      this.#snackBar.open(aprobar ? 'Planeación aprobada.' : 'Planeación devuelta al docente.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected nuevoPlan(): void {
    this.plan.set({
      asignaturaId: this.asignaturaId ?? this.asignaturas()[0]?.id ?? '',
      grado: this.gradoFiltro ?? 6,
      periodo: 1,
      estandares: '',
      dba: '',
      competencias: '',
      contenidos: '',
      indicadores: '',
    });
  }

  protected editarPlan(m: PlanEstudios): void {
    this.plan.set({
      asignaturaId: m.asignaturaId,
      grado: m.grado,
      periodo: m.periodo,
      estandares: m.estandares,
      dba: m.dba,
      competencias: m.competencias,
      contenidos: m.contenidos,
      indicadores: m.indicadores,
    });
  }

  protected async guardarPlan(): Promise<void> {
    const p = this.plan();
    if (!p?.asignaturaId) {
      return;
    }
    this.guardando.set(true);
    try {
      const limpio = (v: string | null): string | null => v?.trim() || null;
      await this.#servicio.guardarPlan({
        ...p,
        estandares: limpio(p.estandares),
        dba: limpio(p.dba),
        competencias: limpio(p.competencias),
        contenidos: limpio(p.contenidos),
        indicadores: limpio(p.indicadores),
      });
      this.plan.set(null);
      await this.cargarPlanes();
      this.#snackBar.open('Malla guardada. Los docentes la ven en su planeador.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminarPlan(m: PlanEstudios): Promise<void> {
    if (!confirm(`¿Eliminar la malla de ${m.asignatura}, ${nombreGrado(m.grado)}, periodo ${m.periodo}?`)) {
      return;
    }
    try {
      await this.#servicio.eliminarPlan(m.id);
      this.planes.update((l) => l.filter((x) => x.id !== m.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }
}

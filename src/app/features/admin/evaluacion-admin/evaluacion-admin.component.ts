import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Curso, Periodo, formatoNota } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import {
  Acta,
  CandidatosComision,
  DECISIONES,
  DecisionActa,
  DecisionComision,
  ESTADOS_RECUPERACION,
  Recuperacion,
} from '../../../core/models/mejoras.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { PanelMejorasService } from '../../../core/services/mejoras.service';
import { SesionService } from '../../../core/services/sesion.service';
import { descargarCsv } from '../../../core/utils/csv';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

interface EditorActa {
  id: string | null;
  grado: number;
  grupo: string | null;
  periodoId: string | null;
  periodo: string;
  fecha: Date;
  integrantes: string;
  observaciones: string;
  decisiones: (DecisionActa & { nombreEstudiante: string })[];
}

/**
 * Comisión de evaluación y promoción (Decreto 1290 de 2009): seguimiento a recuperaciones, estudiantes con
 * dificultades por curso, acta con la decisión para cada uno y actas imprimibles.
 */
@Component({
  selector: 'app-evaluacion-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
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
        class="no-imprimir"
        titulo="Comisión de evaluación y promoción"
        subtitulo="Recuperaciones, estudiantes con dificultades y actas de la comisión (Decreto 1290 de 2009)"
        etiqueta="Panel administrativo"
      />

      @if (error(); as e) {
        <p class="aviso-error no-imprimir" role="alert">{{ e }}</p>
      }

      <div class="barra-filtros no-imprimir">
        <mat-form-field>
          <mat-label>Año</mat-label>
          <mat-select [(ngModel)]="anio" (ngModelChange)="cambiarAnio()">
            @for (a of anios; track a) {
              <mat-option [value]="a">{{ a }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Periodo</mat-label>
          <mat-select [(ngModel)]="periodoId" (ngModelChange)="cargarRecuperaciones()">
            <mat-option [value]="null">Final del año</mat-option>
            @for (p of periodos(); track p.id) {
              <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="curso" (ngModelChange)="cargarRecuperaciones()">
            <mat-option [value]="null">Todos</mat-option>
            @for (c of cursos(); track $index) {
              <mat-option [value]="c">{{ grado(c.grado) }} {{ c.grupo ?? '' }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (impresion(); as acta) {
        <article class="tarjeta acta-impresa">
          <div class="acciones-fila no-imprimir">
            <button mat-button type="button" (click)="impresion.set(null)"><mat-icon aria-hidden="true">arrow_back</mat-icon> Volver</button>
            <button mat-flat-button class="boton-azul" type="button" (click)="imprimir()"><mat-icon aria-hidden="true">print</mat-icon> Imprimir</button>
          </div>
          <header class="membrete">
            <img src="img/escudo.png" alt="" width="64" height="64" />
            <div>
              <strong>INSTITUCIÓN EDUCATIVA JOSÉ DE LA VEGA</strong>
              <span>Cartagena de Indias · DANE 113001001816 · NIT 806.012.497-2</span>
            </div>
          </header>
          <h2>Acta {{ acta.codigo }} · Comisión de evaluación y promoción</h2>
          <p>
            {{ grado(acta.grado) }} {{ acta.grupo ?? '' }} · {{ acta.periodo }} · {{ acta.fecha | date: "d 'de' MMMM 'de' y" }}
          </p>
          @if (acta.integrantes) {
            <p><strong>Integrantes:</strong> {{ acta.integrantes }}</p>
          }
          <table class="tabla-datos">
            <thead><tr><th scope="col">Estudiante</th><th scope="col">Situación</th><th scope="col">Decisión</th><th scope="col">Observación</th></tr></thead>
            <tbody>
              @for (d of acta.decisiones; track d.estudianteId) {
                <tr><td>{{ d.nombreEstudiante }}</td><td>{{ d.situacion }}</td><td>{{ decisiones[d.decision] }}</td><td>{{ d.observacion }}</td></tr>
              }
            </tbody>
          </table>
          @if (acta.observaciones) {
            <p class="pre-linea"><strong>Observaciones:</strong> {{ acta.observaciones }}</p>
          }
          <div class="firmas">
            <span>Rector(a)</span>
            <span>Coordinación académica</span>
            <span>Representante de los docentes</span>
            <span>Representante de los padres</span>
          </div>
        </article>
      } @else {
        <mat-tab-group class="tarjeta" animationDuration="0ms" mat-stretch-tabs="false">
          <mat-tab label="Recuperaciones">
            <div class="acciones-fila pestana">
              <span class="texto-suave">{{ recuperaciones().length }} planes de mejoramiento · {{ pendientes() }} pendientes</span>
              <span class="espacio"></span>
              <button mat-stroked-button type="button" [disabled]="!recuperaciones().length" (click)="exportarRecuperaciones()">
                <mat-icon aria-hidden="true">download</mat-icon> CSV
              </button>
            </div>
            <div class="tabla-desplazable">
              <table class="tabla-datos">
                <thead>
                  <tr>
                    <th scope="col">Estudiante</th><th scope="col">Asignatura</th><th scope="col">Periodo</th>
                    <th scope="col" class="numero">Nota</th><th scope="col">Estado</th><th scope="col" class="numero">Definitiva</th><th scope="col">Docente</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of recuperaciones(); track r.id) {
                    <tr>
                      <td>{{ r.estudiante }}<br /><small class="texto-suave">{{ r.curso }}</small></td>
                      <td>{{ r.asignatura }}</td>
                      <td>{{ r.periodo }}</td>
                      <td class="numero">{{ nota(r.notaOriginal) }}</td>
                      <td><span class="etiqueta-estado" [attr.data-tono]="r.estado === 'Aprobada' ? 'ok' : r.estado === 'Reprobada' ? 'peligro' : 'alerta'">{{ estadosRec[r.estado] }}</span></td>
                      <td class="numero">{{ nota(r.notaDefinitiva) }}</td>
                      <td>{{ r.registradaPor }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="texto-suave">No hay recuperaciones con esos filtros.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>

          <mat-tab label="Comisión por curso">
            <div class="pestana">
              @if (!curso) {
                <p class="texto-suave">Elija un curso arriba para ver los estudiantes con dificultades y preparar el acta.</p>
              } @else {
              @if (editor(); as ed) {
                <h2>{{ ed.id ? 'Editar acta' : 'Nueva acta' }} · {{ grado(ed.grado) }} {{ ed.grupo ?? '' }} · {{ ed.periodo }}</h2>
                <div class="formulario-rejilla">
                  <mat-form-field>
                    <mat-label>Fecha de la reunión</mat-label>
                    <input matInput [matDatepicker]="selector" [(ngModel)]="ed.fecha" />
                    <mat-datepicker-toggle matIconSuffix [for]="selector" />
                    <mat-datepicker #selector />
                  </mat-form-field>
                  <mat-form-field class="ancho-completo">
                    <mat-label>Integrantes</mat-label>
                    <input matInput maxlength="1000" [(ngModel)]="ed.integrantes" />
                  </mat-form-field>
                </div>
                <div class="tabla-desplazable">
                  <table class="tabla-datos">
                    <thead><tr><th scope="col">Estudiante</th><th scope="col">Situación</th><th scope="col">Decisión</th><th scope="col">Observación</th></tr></thead>
                    <tbody>
                      @for (d of ed.decisiones; track d.estudianteId) {
                        <tr>
                          <td>{{ d.nombreEstudiante }}</td>
                          <td class="situacion">{{ d.situacion }}</td>
                          <td>
                            <select [(ngModel)]="d.decision" [attr.aria-label]="'Decisión para ' + d.nombreEstudiante">
                              @for (op of decisionesLista; track op[0]) {
                                <option [value]="op[0]">{{ op[1] }}</option>
                              }
                            </select>
                          </td>
                          <td><input type="text" maxlength="1000" [(ngModel)]="d.observacion" [attr.aria-label]="'Observación para ' + d.nombreEstudiante" /></td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="texto-suave">Ningún estudiante con asignaturas perdidas ni recuperaciones pendientes.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
                <mat-form-field class="observaciones">
                  <mat-label>Observaciones generales y compromisos</mat-label>
                  <textarea matInput rows="3" maxlength="4000" [(ngModel)]="ed.observaciones"></textarea>
                </mat-form-field>
                <div class="acciones-fila">
                  <button mat-button type="button" (click)="editor.set(null)">Cancelar</button>
                  @if (puedeCrear) {
                    <button mat-flat-button class="boton-azul" type="button" [disabled]="guardando()" (click)="guardarActa()">Guardar acta</button>
                  }
                </div>
              } @else {
              @if (candidatos(); as c) {
                <div class="acciones-fila">
                  <span class="texto-suave">{{ c.estudiantes.length }} estudiantes con dificultades en {{ c.periodo }}</span>
                  <span class="espacio"></span>
                  @if (puedeCrear) {
                    <button mat-flat-button class="boton-azul" type="button" (click)="nuevaActa(c)">
                      <mat-icon aria-hidden="true">gavel</mat-icon> Preparar acta
                    </button>
                  }
                </div>
                <div class="tabla-desplazable">
                  <table class="tabla-datos">
                    <thead><tr><th scope="col">Estudiante</th><th scope="col">Asignaturas perdidas</th><th scope="col" class="numero">Fallas</th><th scope="col" class="numero">Promedio</th><th scope="col">Sugerencia</th></tr></thead>
                    <tbody>
                      @for (e of c.estudiantes; track e.estudianteId) {
                        <tr>
                          <td>{{ e.nombreCompleto }}</td>
                          <td>
                            @for (p of e.perdidas; track $index) { {{ p.asignatura }} ({{ nota(p.nota) }}){{ $last ? '' : ', ' }} }
                            @if (e.recuperacionesPendientes) { <br /><small class="texto-suave">{{ e.recuperacionesPendientes }} recuperación(es) pendiente(s)</small> }
                          </td>
                          <td class="numero">{{ e.fallas }}</td>
                          <td class="numero">{{ nota(e.promedio) }}</td>
                          <td>{{ decisiones[e.sugerida] }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="5" class="texto-suave">Ningún estudiante con dificultades en este curso. ¡Excelente!</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <mat-progress-bar mode="indeterminate" aria-label="Cargando estudiantes" />
              }
              }
              }
            </div>
          </mat-tab>

          <mat-tab [label]="'Actas ' + anio">
            <div class="tabla-desplazable pestana">
              <table class="tabla-datos">
                <thead><tr><th scope="col">Acta</th><th scope="col">Curso</th><th scope="col">Periodo</th><th scope="col">Fecha</th><th scope="col" class="numero">Estudiantes</th><th scope="col"></th></tr></thead>
                <tbody>
                  @for (a of actas(); track a.id) {
                    <tr>
                      <td>{{ a.codigo }}</td>
                      <td>{{ grado(a.grado) }} {{ a.grupo ?? '' }}</td>
                      <td>{{ a.periodo }}</td>
                      <td>{{ a.fecha | date: 'd MMM y' }}</td>
                      <td class="numero">{{ a.decisiones.length }}</td>
                      <td class="acciones-fila">
                        <button mat-button type="button" (click)="impresion.set(a)">Ver / imprimir</button>
                        @if (puedeCrear) {
                          <button mat-button type="button" (click)="editarActa(a)">Editar</button>
                        }
                        @if (puedeEliminar) {
                          <button mat-button type="button" (click)="eliminarActa(a)">Eliminar</button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="texto-suave">Aún no hay actas en {{ anio }}.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .pestana {
      margin-block: 1rem;
    }

    .espacio {
      flex: 1;
    }

    h2 {
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    select,
    input[type='text'] {
      padding: 0.35rem;
      border: 1px solid var(--jv-borde);
      border-radius: 6px;
      font: inherit;
    }

    input[type='text'] {
      inline-size: 100%;
      min-inline-size: 12rem;
    }

    .situacion {
      max-inline-size: 30ch;
      font-size: 0.88rem;
    }

    .observaciones {
      inline-size: 100%;
      margin-block-start: 1rem;
    }

    .membrete {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-block-end: 0.75rem;
      border-block-end: 2px solid var(--jv-azul);

      div {
        display: grid;
      }
    }

    .firmas {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3rem 2rem;
      margin-block-start: 4rem;

      span {
        padding-block-start: 0.4rem;
        border-block-start: 1px solid var(--jv-texto);
        text-align: center;
      }
    }
  `,
})
export class EvaluacionAdminComponent implements OnInit {
  readonly #servicio = inject(PanelMejorasService);
  readonly #academico = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #sesion = inject(SesionService);

  protected readonly anios = [new Date().getFullYear(), new Date().getFullYear() - 1];
  protected anio = this.anios[0];
  protected periodoId: string | null = null;
  protected curso: Curso | null = null;

  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly cursos = signal<Curso[]>([]);
  protected readonly recuperaciones = signal<Recuperacion[]>([]);
  protected readonly candidatos = signal<CandidatosComision | null>(null);
  protected readonly actas = signal<Acta[]>([]);
  protected readonly editor = signal<EditorActa | null>(null);
  protected readonly impresion = signal<Acta | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly decisiones = DECISIONES;
  protected readonly decisionesLista = Object.entries(DECISIONES) as [DecisionComision, string][];
  protected readonly estadosRec = ESTADOS_RECUPERACION;
  protected readonly grado = nombreGrado;
  protected readonly nota = formatoNota;
  protected readonly puedeCrear = this.#sesion.puede('Evaluacion', 'Crear');
  protected readonly puedeEliminar = this.#sesion.puede('Evaluacion', 'Eliminar');

  protected pendientes(): number {
    return this.recuperaciones().filter((r) => r.estado === 'Pendiente').length;
  }

  async ngOnInit(): Promise<void> {
    this.#academico
      .cursos()
      .then((c) => this.cursos.set(c))
      .catch(() => undefined);
    await this.cambiarAnio();
  }

  protected async cambiarAnio(): Promise<void> {
    this.periodoId = null;
    try {
      const periodos = await this.#academico.periodos(this.anio);
      this.periodos.set(periodos);
      const hoy = aFechaIso(new Date());
      this.periodoId = [...periodos].reverse().find((p) => p.inicio <= hoy)?.id ?? null;
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
    await Promise.all([this.cargarRecuperaciones(), this.#cargarActas()]);
  }

  protected async cargarRecuperaciones(): Promise<void> {
    this.error.set(null);
    this.editor.set(null);
    try {
      this.recuperaciones.set(
        await this.#servicio.recuperaciones({ anio: this.anio, periodoId: this.periodoId, grado: this.curso?.grado, grupo: this.curso?.grupo }),
      );
      this.candidatos.set(null);
      if (this.curso) {
        this.candidatos.set(
          await this.#servicio.candidatos({ anio: this.anio, periodoId: this.periodoId, grado: this.curso.grado, grupo: this.curso.grupo }),
        );
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected nuevaActa(c: CandidatosComision): void {
    this.editor.set({
      id: null,
      grado: c.grado,
      grupo: c.grupo,
      periodoId: c.periodoId,
      periodo: c.periodo,
      fecha: new Date(),
      integrantes: 'Rector(a), coordinador(a) académico(a), docentes del grado y representante de los padres de familia',
      observaciones: '',
      decisiones: c.estudiantes.map((e) => ({
        estudianteId: e.estudianteId,
        nombreEstudiante: e.nombreCompleto,
        situacion: [
          e.perdidas.length ? `Pierde ${e.perdidas.map((p) => p.asignatura).join(', ')}` : null,
          e.recuperacionesPendientes ? `${e.recuperacionesPendientes} recuperación(es) pendiente(s)` : null,
          e.fallas ? `${e.fallas} fallas` : null,
        ]
          .filter(Boolean)
          .join('; '),
        decision: e.sugerida,
        observacion: null,
      })),
    });
  }

  protected editarActa(a: Acta): void {
    this.curso = this.cursos().find((c) => c.grado === a.grado && c.grupo === a.grupo) ?? { grado: a.grado, grupo: a.grupo, estudiantes: 0 };
    this.editor.set({
      id: a.id,
      grado: a.grado,
      grupo: a.grupo,
      periodoId: a.periodoId,
      periodo: a.periodo,
      fecha: desdeFechaIso(a.fecha),
      integrantes: a.integrantes ?? '',
      observaciones: a.observaciones ?? '',
      decisiones: a.decisiones.map((d) => ({ ...d })),
    });
    this.#snackBar.open('Acta abierta en la pestaña "Comisión por curso".', 'Cerrar', { duration: 3000 });
  }

  protected async guardarActa(): Promise<void> {
    const ed = this.editor();
    if (!ed) {
      return;
    }
    this.guardando.set(true);
    try {
      const acta = await this.#servicio.guardarActa(ed.id, {
        anio: this.anio,
        periodoId: ed.periodoId,
        grado: ed.grado,
        grupo: ed.grupo,
        fecha: aFechaIso(ed.fecha),
        integrantes: ed.integrantes.trim() || null,
        observaciones: ed.observaciones.trim() || null,
        decisiones: ed.decisiones.map((d) => ({
          estudianteId: d.estudianteId,
          situacion: d.situacion || null,
          decision: d.decision,
          observacion: d.observacion?.trim() || null,
        })),
      });
      this.editor.set(null);
      await this.#cargarActas();
      this.impresion.set(acta);
      this.#snackBar.open(`Acta ${acta.codigo} guardada.`, 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminarActa(a: Acta): Promise<void> {
    if (!confirm(`¿Eliminar el acta ${a.codigo}?`)) {
      return;
    }
    try {
      await this.#servicio.eliminarActa(a.id);
      this.actas.update((l) => l.filter((x) => x.id !== a.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected exportarRecuperaciones(): void {
    descargarCsv(
      `recuperaciones-${this.anio}.csv`,
      ['Estudiante', 'Curso', 'Asignatura', 'Periodo', 'Nota periodo', 'Plan', 'Fecha límite', 'Nota recuperación', 'Definitiva', 'Estado', 'Docente'],
      this.recuperaciones().map((r) => [
        r.estudiante,
        r.curso,
        r.asignatura,
        r.periodo,
        r.notaOriginal,
        r.plan,
        r.fechaLimite ?? '',
        r.notaRecuperacion ?? '',
        r.notaDefinitiva ?? '',
        ESTADOS_RECUPERACION[r.estado],
        r.registradaPor,
      ]),
    );
  }

  protected imprimir(): void {
    window.print();
  }

  async #cargarActas(): Promise<void> {
    try {
      this.actas.set(await this.#servicio.actas(this.anio));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CursoDocente, Periodo } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_PLANEACION, EstadoPlaneacion, PlanEstudios, Planeacion } from '../../../core/models/mejoras.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

interface Borrador {
  asignacionId: string;
  periodoId: string | null;
  semana: Date | null;
  tema: string;
  aprendizajes: string;
  actividades: string;
  recursos: string;
  evaluacion: string;
}

export const TONO_PLANEACION: Readonly<Record<EstadoPlaneacion, string>> = {
  Borrador: '',
  Enviada: 'alerta',
  Aprobada: 'ok',
  Devuelta: 'peligro',
};

/**
 * Planeador del docente: planeación semanal por clase, con la malla del colegio (estándares, DBA,
 * competencias e indicadores) a la vista. Se envía a coordinación, que la aprueba o la devuelve.
 */
@Component({
  selector: 'app-planeador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    EncabezadoCampusComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Planeador de clases" subtitulo="Planeación semanal según el plan de estudios (estándares y DBA)" icono="edit_calendar">
        <button mat-flat-button class="boton-institucional" type="button" [disabled]="!cursos().length" (click)="nueva()">
          <mat-icon aria-hidden="true">add</mat-icon>
          Nueva planeación
        </button>
      </app-encabezado-campus>

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (borrador(); as b) {
        <div class="editor">
          <form class="tarjeta" (ngSubmit)="guardar(false)">
            <h2>{{ editandoId() ? 'Editar planeación' : 'Nueva planeación' }}</h2>
            <div class="formulario-rejilla">
              <mat-form-field>
                <mat-label>Clase</mat-label>
                <mat-select name="clase" [(ngModel)]="b.asignacionId" (ngModelChange)="cargarMalla($event)" required>
                  @for (c of cursos(); track c.asignacionId) {
                    <mat-option [value]="c.asignacionId">{{ c.asignatura }} · {{ curso(c) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Periodo</mat-label>
                <mat-select name="periodo" [(ngModel)]="b.periodoId">
                  @for (p of periodos(); track p.id) {
                    <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Semana del</mat-label>
                <input matInput name="semana" [matDatepicker]="selector" [(ngModel)]="b.semana" required />
                <mat-datepicker-toggle matIconSuffix [for]="selector" />
                <mat-datepicker #selector />
              </mat-form-field>
              <mat-form-field class="ancho-completo">
                <mat-label>Tema</mat-label>
                <input matInput name="tema" maxlength="200" required [(ngModel)]="b.tema" />
              </mat-form-field>
              <mat-form-field class="ancho-completo">
                <mat-label>Aprendizajes esperados (estándar / DBA que trabaja)</mat-label>
                <textarea matInput name="aprendizajes" rows="3" maxlength="4000" [(ngModel)]="b.aprendizajes"></textarea>
              </mat-form-field>
              <mat-form-field class="ancho-completo">
                <mat-label>Actividades (inicio, desarrollo y cierre)</mat-label>
                <textarea matInput name="actividades" rows="5" maxlength="4000" [(ngModel)]="b.actividades"></textarea>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Recursos</mat-label>
                <textarea matInput name="recursos" rows="3" maxlength="2000" [(ngModel)]="b.recursos"></textarea>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Evaluación</mat-label>
                <textarea matInput name="evaluacion" rows="3" maxlength="2000" [(ngModel)]="b.evaluacion"></textarea>
              </mat-form-field>
            </div>
            <div class="acciones-fila">
              <span class="espacio"></span>
              <button mat-button type="button" (click)="borrador.set(null)">Cancelar</button>
              <button mat-stroked-button type="submit" [disabled]="guardando()">Guardar borrador</button>
              <button mat-flat-button class="boton-institucional" type="button" [disabled]="guardando()" (click)="guardar(true)">
                Enviar a coordinación
              </button>
            </div>
          </form>

          <aside class="tarjeta malla" aria-labelledby="titulo-malla">
            <h2 id="titulo-malla"><mat-icon aria-hidden="true" inline>account_tree</mat-icon> Plan de estudios</h2>
            @for (m of malla(); track m.id) {
              <mat-expansion-panel [expanded]="$first">
                <mat-expansion-panel-header>Periodo {{ m.periodo }}</mat-expansion-panel-header>
                @if (m.estandares) { <h3>Estándares</h3><p class="pre-linea">{{ m.estandares }}</p> }
                @if (m.dba) { <h3>DBA</h3><p class="pre-linea">{{ m.dba }}</p> }
                @if (m.competencias) { <h3>Competencias</h3><p class="pre-linea">{{ m.competencias }}</p> }
                @if (m.contenidos) { <h3>Contenidos</h3><p class="pre-linea">{{ m.contenidos }}</p> }
                @if (m.indicadores) { <h3>Indicadores de desempeño</h3><p class="pre-linea">{{ m.indicadores }}</p> }
              </mat-expansion-panel>
            } @empty {
              <p class="texto-suave">Coordinación aún no ha cargado la malla de esta asignatura y grado.</p>
            }
          </aside>
        </div>
      }

      @if (planeaciones(); as lista) {
        <section class="tarjeta">
          <h2>Mis planeaciones</h2>
          <div class="tabla-desplazable">
            <table class="tabla-datos">
              <thead>
                <tr><th scope="col">Semana</th><th scope="col">Clase</th><th scope="col">Tema</th><th scope="col">Estado</th><th scope="col"></th></tr>
              </thead>
              <tbody>
                @for (p of lista; track p.id) {
                  <tr>
                    <td>{{ p.semana | date: 'd MMM y' }}</td>
                    <td>{{ p.asignatura }} · {{ grado(p.grado) }} {{ p.grupo ?? '' }}</td>
                    <td>
                      {{ p.tema }}
                      @if (p.observacion) { <br /><small class="observacion">Coordinación: {{ p.observacion }}</small> }
                    </td>
                    <td><span class="etiqueta-estado" [attr.data-tono]="tonos[p.estado]">{{ estados[p.estado] }}</span></td>
                    <td class="acciones-fila">
                      @if (p.estado !== 'Aprobada') {
                        <button mat-button type="button" (click)="editar(p)">{{ p.estado === 'Enviada' ? 'Ver' : 'Editar' }}</button>
                      }
                      @if (p.estado === 'Borrador' || p.estado === 'Devuelta') {
                        <button mat-button type="button" class="peligro" (click)="eliminar(p)">Eliminar</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="texto-suave">Aún no tiene planeaciones. Cree la primera con "Nueva planeación".</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando planeaciones" />
      }
    </div>
  `,
  styles: `
    h2 {
      margin-block-start: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .editor {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
      gap: 1rem;
      margin-block-end: 1rem;
      align-items: start;

      @media (width < 900px) {
        grid-template-columns: 1fr;
      }
    }

    .malla h3 {
      margin: 0.75rem 0 0.2rem;
      color: var(--jv-azul-medio);
      font-size: 0.9rem;
    }

    .malla p {
      margin: 0;
      font-size: 0.9rem;
    }

    .espacio {
      flex: 1;
    }

    .peligro,
    .observacion {
      color: var(--jv-rojo);
    }
  `,
})
export class PlaneadorComponent implements OnInit {
  readonly #academico = inject(CampusAcademicoService);
  readonly #servicio = inject(CampusMejorasService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly cursos = signal<CursoDocente[]>([]);
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly planeaciones = signal<Planeacion[] | null>(null);
  protected readonly malla = signal<PlanEstudios[]>([]);
  protected readonly borrador = signal<Borrador | null>(null);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly estados = ESTADOS_PLANEACION;
  protected readonly tonos = TONO_PLANEACION;
  protected readonly grado = nombreGrado;
  protected readonly periodoActual = computed(() => {
    const hoy = aFechaIso(new Date());
    return this.periodos().find((p) => p.inicio <= hoy && hoy <= p.fin) ?? null;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [datos, planeaciones] = await Promise.all([this.#academico.misCursos(), this.#servicio.misPlaneaciones()]);
      this.cursos.set([...datos.cursos]);
      this.periodos.set([...datos.periodos]);
      this.planeaciones.set(planeaciones);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected curso(c: CursoDocente): string {
    return `${nombreGrado(c.grado)} ${c.grupo ?? ''}`.trim();
  }

  protected nueva(): void {
    const primera = this.cursos()[0];
    this.editandoId.set(null);
    this.borrador.set({
      asignacionId: primera.asignacionId,
      periodoId: this.periodoActual()?.id ?? null,
      semana: lunes(new Date()),
      tema: '',
      aprendizajes: '',
      actividades: '',
      recursos: '',
      evaluacion: '',
    });
    void this.cargarMalla(primera.asignacionId);
  }

  protected editar(p: Planeacion): void {
    this.editandoId.set(p.id);
    this.borrador.set({
      asignacionId: p.asignacionId,
      periodoId: p.periodoId,
      semana: desdeFechaIso(p.semana),
      tema: p.tema,
      aprendizajes: p.aprendizajes ?? '',
      actividades: p.actividades ?? '',
      recursos: p.recursos ?? '',
      evaluacion: p.evaluacion ?? '',
    });
    void this.cargarMalla(p.asignacionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async cargarMalla(asignacionId: string): Promise<void> {
    try {
      this.malla.set(await this.#servicio.malla(asignacionId));
    } catch {
      this.malla.set([]);
    }
  }

  protected async guardar(enviar: boolean): Promise<void> {
    const b = this.borrador();
    if (!b?.semana || !b.tema.trim()) {
      this.#snackBar.open('Elija la semana y escriba el tema.', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      const id = this.editandoId();
      const guardada = await this.#servicio.guardarPlaneacion(id, {
        asignacionId: b.asignacionId,
        periodoId: b.periodoId,
        semana: aFechaIso(b.semana),
        tema: b.tema.trim(),
        aprendizajes: b.aprendizajes.trim() || null,
        actividades: b.actividades.trim() || null,
        recursos: b.recursos.trim() || null,
        evaluacion: b.evaluacion.trim() || null,
        enviar,
      });
      this.planeaciones.update((lista) => (id ? (lista ?? []).map((p) => (p.id === id ? guardada : p)) : [guardada, ...(lista ?? [])]));
      this.borrador.set(null);
      this.#snackBar.open(enviar ? 'Planeación enviada a coordinación.' : 'Borrador guardado.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminar(p: Planeacion): Promise<void> {
    if (!confirm(`¿Eliminar la planeación "${p.tema}"?`)) {
      return;
    }
    try {
      await this.#servicio.eliminarPlaneacion(p.id);
      this.planeaciones.update((lista) => (lista ?? []).filter((x) => x.id !== p.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }
}

function lunes(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

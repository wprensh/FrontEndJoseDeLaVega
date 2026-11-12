import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Periodo, formatoNota } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_RECUPERACION, FilaRecuperacionClase, RecuperacionesClase } from '../../../core/models/mejoras.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { aFechaIso } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/**
 * Recuperaciones de una clase: el docente asigna el plan de mejoramiento a quienes perdieron el periodo
 * (la familia recibe el aviso) y registra la nota de la recuperación. Si aprueba, la nota del periodo sube a 3,0.
 */
@Component({
  selector: 'app-recuperaciones-docente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    EncabezadoCampusComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        [titulo]="'Recuperaciones · ' + titulo()"
        subtitulo="Planes de mejoramiento de quienes no alcanzaron 3,0 en el periodo"
        icono="restart_alt"
        [volverA]="['/campus/docente', asignacionId()]"
        textoVolver="Planilla de la clase"
      />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      <div class="barra-filtros">
        <mat-form-field>
          <mat-label>Periodo</mat-label>
          <mat-select [ngModel]="periodoId()" (ngModelChange)="cambiarPeriodo($event)">
            @for (p of periodos(); track p.id) {
              <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (datos(); as d) {
          <span class="texto-suave">{{ d.filas.length }} estudiantes con nota por debajo de 3,0</span>
        }
      </div>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando recuperaciones" />
      }

      @if (datos(); as d) {
        @if (sinPlan().length) {
          <section class="tarjeta">
            <h2>Asignar plan de mejoramiento</h2>
            <p class="texto-suave">Marque los estudiantes, describa las actividades y la fecha límite. Cada familia recibe el aviso.</p>
            <ul class="seleccion">
              @for (f of sinPlan(); track f.estudianteId) {
                <li>
                  <mat-checkbox [checked]="seleccion().has(f.estudianteId)" (change)="alternar(f.estudianteId)">
                    {{ f.nombreCompleto }} · nota {{ nota(f.notaPeriodo) }}
                  </mat-checkbox>
                </li>
              }
            </ul>
            <div class="formulario-rejilla">
              <mat-form-field class="ancho-completo">
                <mat-label>Plan de mejoramiento</mat-label>
                <textarea matInput rows="4" maxlength="4000" [(ngModel)]="plan" placeholder="Taller de repaso de fracciones (págs. 20-25), sustentación oral el día…"></textarea>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Fecha límite</mat-label>
                <input matInput [matDatepicker]="selector" [(ngModel)]="fechaLimite" />
                <mat-datepicker-toggle matIconSuffix [for]="selector" />
                <mat-datepicker #selector />
              </mat-form-field>
            </div>
            <div class="acciones-fila">
              <button mat-button type="button" (click)="seleccionarTodos()">Marcar todos</button>
              <button mat-flat-button class="boton-institucional" type="button" [disabled]="guardando() || !seleccion().size" (click)="asignar()">
                Asignar a {{ seleccion().size }} estudiante(s)
              </button>
            </div>
          </section>
        }

        <section class="tarjeta">
          <h2>Seguimiento</h2>
          <div class="tabla-desplazable">
            <table class="tabla-datos">
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col" class="numero">Nota periodo</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Nota recuperación</th>
                </tr>
              </thead>
              <tbody>
                @for (f of d.filas; track f.estudianteId) {
                  <tr>
                    <td>{{ f.nombreCompleto }}<br /><small class="texto-suave">{{ f.documento }}</small></td>
                    <td class="numero">{{ nota(f.recuperacion?.notaOriginal ?? f.notaPeriodo) }}</td>
                    <td>
                      @if (f.recuperacion; as r) {
                        <span class="pre-linea">{{ r.plan }}</span>
                        @if (r.fechaLimite) { <br /><small class="texto-suave">Hasta {{ r.fechaLimite | date: 'd MMM y' }}</small> }
                      } @else {
                        <span class="texto-suave">Sin plan</span>
                      }
                    </td>
                    <td>
                      @if (f.recuperacion; as r) {
                        <span class="etiqueta-estado" [attr.data-tono]="tono(r.estado)">{{ estados[r.estado] }}</span>
                        @if (r.notaDefinitiva !== null) { <br /><small>Definitiva {{ nota(r.notaDefinitiva) }}</small> }
                      }
                    </td>
                    <td>
                      @if (f.recuperacion; as r) {
                        <div class="calificar">
                          <input type="number" min="1" max="5" step="0.1" [attr.aria-label]="'Nota de recuperación de ' + f.nombreCompleto" [ngModel]="r.notaRecuperacion" (ngModelChange)="notas[r.id] = $event" />
                          <button mat-stroked-button type="button" [disabled]="guardando()" (click)="calificar(f)">Guardar</button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="texto-suave">Nadie perdió esta asignatura en el periodo. ¡Bien!</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    section.tarjeta {
      margin-block-end: 1rem;
    }

    h2 {
      margin-block-start: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .seleccion {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
    }

    .calificar {
      display: flex;
      gap: 0.4rem;
      align-items: center;

      input {
        inline-size: 4.5rem;
        padding: 0.35rem;
        border: 1px solid var(--jv-borde);
        border-radius: 6px;
        font: inherit;
      }
    }
  `,
})
export class RecuperacionesDocenteComponent implements OnInit {
  readonly asignacionId = input.required<string>();

  readonly #academico = inject(CampusAcademicoService);
  readonly #servicio = inject(CampusMejorasService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly periodoId = signal<string | null>(null);
  protected readonly datos = signal<RecuperacionesClase | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly seleccion = signal(new Set<string>());
  protected readonly estados = ESTADOS_RECUPERACION;
  protected readonly nota = formatoNota;
  protected plan = '';
  protected fechaLimite: Date | null = null;
  protected readonly notas: Record<string, number | null> = {};

  protected readonly titulo = computed(() => {
    const d = this.datos();
    return d ? `${d.asignatura} · ${nombreGrado(d.grado)} ${d.grupo ?? ''}`.trim() : 'Clase';
  });
  protected readonly sinPlan = computed(() => (this.datos()?.filas ?? []).filter((f) => !f.recuperacion));

  async ngOnInit(): Promise<void> {
    try {
      const datos = await this.#academico.misCursos();
      this.periodos.set([...datos.periodos]);
      const hoy = aFechaIso(new Date());
      // Por defecto, el último periodo que ya empezó.
      const actual = [...datos.periodos].reverse().find((p) => p.inicio <= hoy) ?? datos.periodos[0];
      if (actual) {
        await this.cambiarPeriodo(actual.id);
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected async cambiarPeriodo(id: string): Promise<void> {
    this.periodoId.set(id);
    this.seleccion.set(new Set());
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.datos.set(await this.#servicio.recuperacionesClase(this.asignacionId(), id));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected tono(estado: string): string {
    return estado === 'Aprobada' ? 'ok' : estado === 'Reprobada' ? 'peligro' : 'alerta';
  }

  protected alternar(id: string): void {
    this.seleccion.update((s) => {
      const nueva = new Set(s);
      if (!nueva.delete(id)) {
        nueva.add(id);
      }
      return nueva;
    });
  }

  protected seleccionarTodos(): void {
    this.seleccion.set(new Set(this.sinPlan().map((f) => f.estudianteId)));
  }

  protected async asignar(): Promise<void> {
    const periodoId = this.periodoId();
    if (!periodoId || !this.plan.trim()) {
      this.#snackBar.open('Describa el plan de mejoramiento.', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      this.datos.set(
        await this.#servicio.asignarPlanes(this.asignacionId(), periodoId, {
          estudianteIds: [...this.seleccion()],
          plan: this.plan.trim(),
          fechaLimite: this.fechaLimite ? aFechaIso(this.fechaLimite) : null,
        }),
      );
      this.seleccion.set(new Set());
      this.plan = '';
      this.#snackBar.open('Plan asignado. Las familias recibieron el aviso.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async calificar(fila: FilaRecuperacionClase): Promise<void> {
    const r = fila.recuperacion;
    const nota = r ? (this.notas[r.id] ?? r.notaRecuperacion) : null;
    if (!r || nota === null || nota < 1 || nota > 5) {
      this.#snackBar.open('Escriba una nota entre 1,0 y 5,0.', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      const actualizada = await this.#servicio.calificarRecuperacion(r.id, Number(nota), null);
      this.datos.update((d) =>
        d ? { ...d, filas: d.filas.map((f) => (f.estudianteId === fila.estudianteId ? { ...f, recuperacion: actualizada } : f)) } : d,
      );
      this.#snackBar.open(
        actualizada.estado === 'Aprobada'
          ? `Recuperó: la nota del periodo queda en ${formatoNota(actualizada.notaDefinitiva)}.`
          : 'Nota registrada: no alcanzó 3,0.',
        'Cerrar',
        { duration: 4000 },
      );
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }
}

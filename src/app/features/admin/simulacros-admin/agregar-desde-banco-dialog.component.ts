import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import {
  AREAS,
  AREAS_PRUEBA,
  AgregadasDesdeBanco,
  AreaEvaluada,
  DIFICULTADES,
  DificultadPregunta,
  PreguntaBanco,
  Simulacro,
} from '../../../core/models/simulacro.model';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';

export interface AgregarDesdeBancoData {
  readonly simulacro: Simulacro;
  /** Ids del banco que el simulacro ya tiene (no se ofrecen otra vez). */
  readonly yaIncluidas: readonly string[];
}

/** Agrega al simulacro preguntas del banco: al azar repartidas por área, o elegidas una por una. */
@Component({
  selector: 'app-agregar-desde-banco-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Agregar desde el banco</h2>
    <mat-dialog-content>
      <mat-button-toggle-group [value]="modo()" (change)="modo.set($event.value)" aria-label="Cómo elegir las preguntas">
        <mat-button-toggle value="azar">Al azar por área</mat-button-toggle>
        <mat-button-toggle value="elegir">Elegirlas</mat-button-toggle>
      </mat-button-toggle-group>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando el banco" />
      }

      @if (modo() === 'azar') {
        <div class="fila">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" min="1" max="300" [(ngModel)]="cantidad" />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Dificultad</mat-label>
            <mat-select [(ngModel)]="dificultad">
              <mat-option [value]="null">Cualquiera</mat-option>
              @for (d of dificultades; track d[0]) {
                <mat-option [value]="d[0]">{{ d[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <fieldset class="areas">
          <legend>Áreas (la cantidad se reparte por igual)</legend>
          @for (a of areasPrueba; track a) {
            <mat-checkbox [checked]="areasAzar().includes(a)" (change)="alternarArea(a, $event.checked)">
              {{ nombres[a] }} <span class="disponibles">({{ disponiblesPorArea().get(a) ?? 0 }} disponibles)</span>
            </mat-checkbox>
          }
        </fieldset>
        <p class="ayuda">
          Se toman preguntas para {{ grados }} que el simulacro aún no tiene. Si a un área le faltan, se completa con las demás.
        </p>
      } @else {
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Área</mat-label>
          <mat-select [value]="areaFiltro()" (selectionChange)="areaFiltro.set($event.value)">
            <mat-option [value]="null">Todas</mat-option>
            @for (a of areasPrueba; track a) {
              <mat-option [value]="a">{{ nombres[a] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <ul class="lista">
          @for (p of visibles(); track p.id) {
            <li>
              <mat-checkbox [checked]="elegidas().has(p.id)" (change)="alternar(p.id, $event.checked)">
                <span class="area">{{ nombres[p.area] }} · {{ p.dificultad }}</span>
                <span class="enunciado">{{ p.enunciado }}</span>
              </mat-checkbox>
            </li>
          } @empty {
            @if (!cargando()) {
              <li class="vacio">No hay preguntas nuevas del banco para este simulacro.</li>
            }
          }
        </ul>
        <p class="ayuda">{{ elegidas().size }} elegida(s)</p>
      }

      @if (error(); as e) {
        <p class="error" role="alert">{{ e }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button class="boton-azul" type="button" [disabled]="guardando() || !puedeAgregar()" (click)="agregar()">
        {{ guardando() ? 'Agregando...' : 'Agregar al simulacro' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    .fila {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: 0.75rem;
    }

    .areas {
      display: grid;
      margin: 0;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);

      legend {
        padding-inline: 0.3rem;
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
      }
    }

    .disponibles,
    .ayuda {
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .ayuda {
      margin: 0;
    }

    .lista {
      display: grid;
      gap: 0.25rem;
      max-block-size: 50vh;
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;

      li {
        padding-block: 0.25rem;
        border-block-end: 1px solid var(--jv-borde);
      }

      .area {
        display: block;
        color: var(--jv-texto-suave);
        font-size: 0.78rem;
      }

      .enunciado {
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .vacio {
        padding: 1rem;
        color: var(--jv-texto-suave);
        text-align: center;
      }
    }

    .error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class AgregarDesdeBancoDialogComponent implements OnInit {
  protected readonly data = inject<AgregarDesdeBancoData>(MAT_DIALOG_DATA);
  readonly #ref = inject(MatDialogRef<AgregarDesdeBancoDialogComponent, AgregadasDesdeBanco>);
  readonly #servicio = inject(SimulacrosService);

  protected readonly nombres = AREAS;
  protected readonly dificultades = Object.entries(DIFICULTADES) as [DificultadPregunta, string][];
  protected readonly areasPrueba = AREAS_PRUEBA[this.data.simulacro.tipo];
  protected readonly grados = this.data.simulacro.grados.length === 1 ? `${this.data.simulacro.grados[0]}°` : 'los grados del simulacro';

  protected readonly modo = signal<'azar' | 'elegir'>('azar');
  protected readonly banco = signal<PreguntaBanco[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected cantidad = 20;
  protected dificultad: DificultadPregunta | null = null;
  protected readonly areasAzar = signal<AreaEvaluada[]>([...this.areasPrueba]);
  protected readonly areaFiltro = signal<AreaEvaluada | null>(null);
  protected readonly elegidas = signal(new Set<string>());

  /** Preguntas del banco que sirven para el simulacro y que aún no tiene. */
  protected readonly disponibles = computed(() => {
    const ya = new Set(this.data.yaIncluidas);
    const grados = this.data.simulacro.grados;
    return this.banco().filter(
      (p) =>
        !ya.has(p.id) &&
        this.areasPrueba.includes(p.area) &&
        (!p.grados.length || p.grados.some((g) => grados.includes(g))),
    );
  });

  protected readonly disponiblesPorArea = computed(() => {
    const conteo = new Map<AreaEvaluada, number>();
    for (const p of this.disponibles()) {
      conteo.set(p.area, (conteo.get(p.area) ?? 0) + 1);
    }
    return conteo;
  });

  protected readonly visibles = computed(() => {
    const area = this.areaFiltro();
    return this.disponibles().filter((p) => !area || p.area === area);
  });

  ngOnInit(): void {
    void this.#cargar();
  }

  async #cargar(): Promise<void> {
    try {
      this.banco.set(await this.#servicio.banco());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected alternarArea(area: AreaEvaluada, marcada: boolean): void {
    this.areasAzar.update((lista) =>
      marcada ? this.areasPrueba.filter((a) => a === area || lista.includes(a)) : lista.filter((a) => a !== area),
    );
  }

  protected alternar(id: string, marcada: boolean): void {
    this.elegidas.update((actual) => {
      const copia = new Set(actual);
      if (marcada) {
        copia.add(id);
      } else {
        copia.delete(id);
      }
      return copia;
    });
  }

  protected puedeAgregar(): boolean {
    return this.modo() === 'azar' ? this.cantidad > 0 && this.areasAzar().length > 0 : this.elegidas().size > 0;
  }

  protected async agregar(): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      // Las elegidas se envían en el orden del banco (agrupadas por área).
      const ids = this.disponibles().filter((p) => this.elegidas().has(p.id)).map((p) => p.id);
      const resultado = await this.#servicio.agregarDesdeBanco(
        this.data.simulacro.id,
        this.modo() === 'azar'
          ? { cantidad: this.cantidad, areas: this.areasAzar(), dificultad: this.dificultad }
          : { preguntaIds: ids },
      );
      this.#ref.close(resultado);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

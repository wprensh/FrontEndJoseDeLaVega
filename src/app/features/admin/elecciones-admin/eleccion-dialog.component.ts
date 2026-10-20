import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CARGOS, CargoEleccion, Eleccion } from '../../../core/models/eleccion.model';
import { EleccionesService } from '../../../core/services/elecciones.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';

/** "2027-02-20T07:00" en la hora del equipo, para un input datetime-local. */
export function aFechaHoraLocal(iso: string | Date): string {
  const fecha = new Date(iso);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/** Crear o editar una jornada electoral: nombre, horario de votación y cargos. */
@Component({
  selector: 'app-eleccion-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ eleccion ? 'Editar elección' : 'Nueva elección' }}</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" maxlength="120" placeholder="Gobierno escolar 2027" />
          @if (formulario.controls.nombre.invalid) {
            <mat-error>{{ formulario.controls.nombre.getError('servidor') ?? 'Escriba el nombre de la elección.' }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Indicaciones para los estudiantes (opcional)</mat-label>
          <textarea matInput formControlName="descripcion" rows="2" maxlength="1000"></textarea>
        </mat-form-field>

        <div class="fila">
          <mat-form-field>
            <mat-label>Abre la votación</mat-label>
            <input matInput type="datetime-local" formControlName="inicio" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Cierra la votación</mat-label>
            <input matInput type="datetime-local" formControlName="fin" />
            @if (formulario.controls.fin.invalid) {
              <mat-error>{{ formulario.controls.fin.getError('servidor') ?? 'El cierre debe ser posterior a la apertura.' }}</mat-error>
            }
          </mat-form-field>
        </div>

        <fieldset>
          <legend>Cargos que se eligen</legend>
          @for (c of cargos; track c.cargo) {
            <mat-checkbox [checked]="elegidos().has(c.cargo)" (change)="alternar(c.cargo, $event.checked)">
              <span class="cargo">{{ c.nombre }}</span>
              <span class="regla">Candidatos: {{ c.quienes }}. Votan: {{ c.votan }}.</span>
            </mat-checkbox>
          }
          @if (sinCargos()) {
            <p class="aviso-error">Elija al menos un cargo.</p>
          }
        </fieldset>

        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : eleccion ? 'Guardar cambios' : 'Crear elección' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    .fila {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    fieldset {
      display: grid;
      gap: 0.25rem;
      margin: 0;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);
    }

    legend {
      padding: 0 0.35rem;
      font-weight: 600;
    }

    .cargo {
      display: block;
      font-weight: 600;
    }

    .regla {
      display: block;
      color: var(--jv-texto-suave);
      font-size: 0.82rem;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class EleccionDialogComponent {
  readonly #servicio = inject(EleccionesService);
  readonly #ref = inject(MatDialogRef<EleccionDialogComponent, Eleccion>);
  protected readonly eleccion = inject<Eleccion | null>(MAT_DIALOG_DATA);

  protected readonly cargos = CARGOS;
  protected readonly elegidos = signal(
    new Set<CargoEleccion>(this.eleccion?.cargos ?? ['Personero', 'Contralor', 'VoceroGrado']),
  );
  protected readonly sinCargos = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    nombre: [this.eleccion?.nombre ?? `Gobierno escolar ${new Date().getFullYear()}`, [Validators.required, Validators.maxLength(120)]],
    descripcion: [this.eleccion?.descripcion ?? ''],
    inicio: [this.eleccion ? aFechaHoraLocal(this.eleccion.inicio) : manana(7), Validators.required],
    fin: [this.eleccion ? aFechaHoraLocal(this.eleccion.fin) : manana(12), Validators.required],
  });

  protected alternar(cargo: CargoEleccion, marcado: boolean): void {
    this.elegidos.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) {
        nuevo.add(cargo);
      } else {
        nuevo.delete(cargo);
      }
      return nuevo;
    });
    this.sinCargos.set(this.elegidos().size === 0);
  }

  protected async guardar(): Promise<void> {
    const v = this.formulario.getRawValue();
    if (v.inicio && v.fin && new Date(v.fin) <= new Date(v.inicio)) {
      this.formulario.controls.fin.setErrors({ orden: true });
    }
    this.sinCargos.set(this.elegidos().size === 0);
    if (this.formulario.invalid || this.sinCargos()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      inicio: new Date(v.inicio).toISOString(),
      fin: new Date(v.fin).toISOString(),
      cargos: CARGOS.map((c) => c.cargo).filter((c) => this.elegidos().has(c)),
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      this.#ref.close(
        this.eleccion
          ? await this.#servicio.actualizar(this.eleccion.id, datos)
          : await this.#servicio.crear(datos),
      );
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.guardando.set(false);
    }
  }
}

function manana(hora: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  fecha.setHours(hora, 0, 0, 0);
  return aFechaHoraLocal(fecha);
}

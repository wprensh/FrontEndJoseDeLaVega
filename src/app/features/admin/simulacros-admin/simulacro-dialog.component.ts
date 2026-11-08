import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTimepickerModule } from '@angular/material/timepicker';

import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { GRADOS_PRUEBA, Simulacro, TIPOS_PRUEBA, TipoPrueba } from '../../../core/models/simulacro.model';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/**
 * ISO con zona horaria ↔ Date cuyo día y hora del calendario son la hora de Colombia,
 * sin importar la zona horaria configurada en el equipo.
 */
function aLocal(iso: string): Date {
  const d = new Date(Date.parse(iso) - 5 * 3600_000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
}

function aIso(local: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${local.getFullYear()}-${dos(local.getMonth() + 1)}-${dos(local.getDate())}T${dos(local.getHours())}:${dos(local.getMinutes())}:00-05:00`;
}

/** Crear o editar los datos de un simulacro (las preguntas se editan aparte). */
@Component({
  selector: 'app-simulacro-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTimepickerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ simulacro ? 'Editar simulacro' : 'Nuevo simulacro' }}</h2>
    <form (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Título</mat-label>
          <input matInput name="titulo" maxlength="150" [(ngModel)]="datos.titulo" required placeholder="Simulacro Saber 11 – Sesión 1" />
        </mat-form-field>
        <div class="fila">
          <mat-form-field>
            <mat-label>Prueba</mat-label>
            <mat-select name="tipo" [(ngModel)]="datos.tipo" (selectionChange)="cambiarTipo($event.value)">
              @for (t of tipos; track t[0]) {
                <mat-option [value]="t[0]">{{ t[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Duración (minutos)</mat-label>
            <input matInput type="number" min="5" max="600" name="duracion" [(ngModel)]="datos.duracionMinutos" required />
          </mat-form-field>
        </div>
        <fieldset>
          <legend>Grados que lo presentan</legend>
          @for (g of grados; track g) {
            <mat-checkbox [checked]="datos.grados.includes(g)" (change)="alternarGrado(g, $event.checked)">{{ nombreGrado(g) }}</mat-checkbox>
          }
        </fieldset>
        <div class="fila">
          <mat-form-field>
            <mat-label>Abre el día</mat-label>
            <input matInput [matDatepicker]="diaInicio" name="diaInicio" [(ngModel)]="inicio" required />
            <mat-datepicker-toggle matIconSuffix [for]="diaInicio" />
            <mat-datepicker #diaInicio />
          </mat-form-field>
          <mat-form-field>
            <mat-label>A la hora</mat-label>
            <input matInput [matTimepicker]="horaInicio" name="horaInicio" [(ngModel)]="inicio" required />
            <mat-timepicker-toggle matIconSuffix [for]="horaInicio" />
            <mat-timepicker #horaInicio />
          </mat-form-field>
        </div>
        <div class="fila">
          <mat-form-field>
            <mat-label>Cierra el día</mat-label>
            <input matInput [matDatepicker]="diaFin" name="diaFin" [(ngModel)]="fin" required />
            <mat-datepicker-toggle matIconSuffix [for]="diaFin" />
            <mat-datepicker #diaFin />
          </mat-form-field>
          <mat-form-field>
            <mat-label>A la hora</mat-label>
            <input matInput [matTimepicker]="horaFin" name="horaFin" [(ngModel)]="fin" required />
            <mat-timepicker-toggle matIconSuffix [for]="horaFin" />
            <mat-timepicker #horaFin />
          </mat-form-field>
        </div>
        <mat-form-field>
          <mat-label>Instrucciones (opcional)</mat-label>
          <textarea matInput rows="3" maxlength="3000" name="instrucciones" [(ngModel)]="datos.instrucciones"></textarea>
        </mat-form-field>
        <mat-slide-toggle name="mostrar" [(ngModel)]="datos.mostrarRespuestas">
          Mostrar respuestas correctas y explicaciones al cerrar el simulacro
        </mat-slide-toggle>
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.5rem;
    }

    .fila {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    fieldset {
      display: flex;
      flex-wrap: wrap;
      gap: 0 0.5rem;
      margin: 0 0 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);
    }

    legend {
      padding-inline: 0.3rem;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class SimulacroDialogComponent {
  readonly #servicio = inject(SimulacrosService);
  readonly #ref = inject(MatDialogRef<SimulacroDialogComponent, Simulacro>);
  protected readonly simulacro = inject<Simulacro | null>(MAT_DIALOG_DATA);

  protected readonly tipos = Object.entries(TIPOS_PRUEBA) as [TipoPrueba, string][];
  protected readonly grados = GRADOS.filter((g) => g > 0);
  protected readonly nombreGrado = nombreGrado;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly datos = {
    titulo: this.simulacro?.titulo ?? '',
    instrucciones: this.simulacro?.instrucciones ?? '',
    tipo: this.simulacro?.tipo ?? ('Saber11' as TipoPrueba),
    grados: [...(this.simulacro?.grados ?? [11])],
    duracionMinutos: this.simulacro?.duracionMinutos ?? 120,
    mostrarRespuestas: this.simulacro?.mostrarRespuestas ?? true,
  };
  protected inicio: Date | null = this.simulacro ? aLocal(this.simulacro.inicio) : null;
  protected fin: Date | null = this.simulacro ? aLocal(this.simulacro.fin) : null;

  protected cambiarTipo(tipo: TipoPrueba): void {
    const sugeridos = GRADOS_PRUEBA[tipo];
    if (sugeridos.length) {
      this.datos.grados = [sugeridos.at(-1)!];
    }
  }

  protected alternarGrado(grado: number, marcado: boolean): void {
    this.datos.grados = marcado
      ? [...new Set([...this.datos.grados, grado])].sort((a, b) => a - b)
      : this.datos.grados.filter((g) => g !== grado);
  }

  protected async guardar(): Promise<void> {
    if (!this.datos.titulo.trim() || !this.inicio || !this.fin || !this.datos.grados.length) {
      this.error.set('Complete el título, los grados y el horario.');
      return;
    }
    if (this.fin.getTime() <= this.inicio.getTime()) {
      this.error.set('El cierre debe ser posterior a la apertura.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardado = await this.#servicio.guardar(this.simulacro?.id ?? null, {
        ...this.datos,
        titulo: this.datos.titulo.trim(),
        instrucciones: this.datos.instrucciones.trim() || null,
        inicio: aIso(this.inicio),
        fin: aIso(this.fin),
      });
      this.#ref.close(guardado);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

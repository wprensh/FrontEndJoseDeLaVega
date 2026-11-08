import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import {
  AREAS,
  AreaEvaluada,
  DIFICULTADES,
  GuardarPreguntaBanco,
  LETRAS,
  OPCIONES_MAXIMAS,
  PreguntaBanco,
} from '../../../core/models/simulacro.model';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Datos al abrir: la pregunta a editar, o null para una nueva (con el área sugerida). */
export interface PreguntaBancoDialogData {
  readonly pregunta: PreguntaBanco | null;
  readonly area?: AreaEvaluada;
}

/** Crear o editar una pregunta del banco. */
@Component({
  selector: 'app-pregunta-banco-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.pregunta ? 'Editar pregunta del banco' : 'Nueva pregunta del banco' }}</h2>
    <form (ngSubmit)="guardar()">
      <mat-dialog-content>
        <div class="fila">
          <mat-form-field>
            <mat-label>Área</mat-label>
            <mat-select name="area" [(ngModel)]="datos.area" required>
              @for (a of areas; track a[0]) {
                <mat-option [value]="a[0]">{{ a[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Dificultad</mat-label>
            <mat-select name="dificultad" [(ngModel)]="datos.dificultad">
              @for (d of dificultades; track d[0]) {
                <mat-option [value]="d[0]">{{ d[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Grados</mat-label>
            <mat-select name="grados" multiple [(ngModel)]="datos.grados" placeholder="Todos">
              @for (g of grados; track g) {
                <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
              }
            </mat-select>
            <mat-hint>Vacío = sirve para cualquier grado</mat-hint>
          </mat-form-field>
        </div>
        <mat-form-field>
          <mat-label>Competencia (opcional)</mat-label>
          <input matInput name="competencia" maxlength="120" [(ngModel)]="datos.competencia" placeholder="Interpretación y representación" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Contexto o lectura (opcional)</mat-label>
          <textarea matInput name="contexto" rows="3" maxlength="6000" [(ngModel)]="datos.contexto"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Enunciado</mat-label>
          <textarea matInput name="enunciado" rows="2" maxlength="3000" required [(ngModel)]="datos.enunciado"></textarea>
        </mat-form-field>

        <mat-radio-group name="correcta" class="opciones" aria-label="Respuesta correcta" [(ngModel)]="datos.correcta">
          @for (o of datos.opciones; track $index; let j = $index) {
            <div class="opcion" [class.correcta]="datos.correcta === j">
              <mat-radio-button [value]="j" [attr.aria-label]="'Marcar ' + letras[j] + ' como correcta'">{{ letras[j] }}</mat-radio-button>
              <input
                class="texto-opcion"
                [attr.aria-label]="'Opción ' + letras[j]"
                maxlength="1000"
                [value]="o"
                (input)="datos.opciones[j] = $any($event.target).value"
              />
              @if (datos.opciones.length > 2) {
                <button mat-icon-button type="button" aria-label="Quitar opción" (click)="quitarOpcion(j)">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </div>
          }
        </mat-radio-group>
        @if (datos.opciones.length < maximo) {
          <button mat-button type="button" (click)="datos.opciones.push('')">
            <mat-icon aria-hidden="true">add</mat-icon>
            Opción
          </button>
        }
        <p class="ayuda">Marque el círculo de la respuesta correcta.</p>

        <mat-form-field>
          <mat-label>Explicación de la respuesta (opcional)</mat-label>
          <textarea matInput name="explicacion" rows="2" maxlength="2000" [(ngModel)]="datos.explicacion"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Enlace de imagen https (opcional)</mat-label>
          <input matInput name="imagenUrl" type="url" maxlength="500" [(ngModel)]="datos.imagenUrl" />
        </mat-form-field>
        @if (error(); as e) {
          <p class="error" role="alert">{{ e }}</p>
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
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0 0.75rem;
    }

    .opciones {
      display: grid;
      gap: 0.35rem;
    }

    .opcion {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.15rem 0.4rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);

      &.correcta {
        border-color: #7cc49a;
        background: #eef8f2;
      }
    }

    .texto-opcion {
      flex: 1;
      min-inline-size: 0;
      padding: 0.45rem;
      border: 0;
      background: transparent;
      font: inherit;
    }

    .ayuda {
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .error {
      color: var(--jv-rojo);
    }
  `,
})
export class PreguntaBancoDialogComponent {
  protected readonly data = inject<PreguntaBancoDialogData>(MAT_DIALOG_DATA);
  readonly #ref = inject(MatDialogRef<PreguntaBancoDialogComponent, PreguntaBanco>);
  readonly #servicio = inject(SimulacrosService);

  protected readonly areas = Object.entries(AREAS) as [AreaEvaluada, string][];
  protected readonly dificultades = Object.entries(DIFICULTADES);
  protected readonly grados = GRADOS;
  protected readonly letras = LETRAS;
  protected readonly maximo = OPCIONES_MAXIMAS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly datos: GuardarPreguntaBanco = this.data.pregunta
    ? {
        area: this.data.pregunta.area,
        competencia: this.data.pregunta.competencia,
        contexto: this.data.pregunta.contexto,
        enunciado: this.data.pregunta.enunciado,
        imagenUrl: this.data.pregunta.imagenUrl,
        opciones: [...this.data.pregunta.opciones],
        correcta: this.data.pregunta.correcta,
        explicacion: this.data.pregunta.explicacion,
        grados: [...this.data.pregunta.grados],
        dificultad: this.data.pregunta.dificultad,
      }
    : {
        area: this.data.area ?? 'Matematicas',
        competencia: null,
        contexto: null,
        enunciado: '',
        imagenUrl: null,
        opciones: ['', '', '', ''],
        correcta: 0,
        explicacion: null,
        grados: [10, 11],
        dificultad: 'Media',
      };

  protected quitarOpcion(indice: number): void {
    this.datos.opciones.splice(indice, 1);
    if (this.datos.correcta === indice) {
      this.datos.correcta = 0;
    } else if (this.datos.correcta > indice) {
      this.datos.correcta--;
    }
  }

  protected async guardar(): Promise<void> {
    const d = this.datos;
    if (!d.enunciado.trim() || d.opciones.some((o) => !o.trim())) {
      this.error.set('Escriba el enunciado y todas las opciones.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardada = await this.#servicio.guardarEnBanco(this.data.pregunta?.id ?? null, {
        ...d,
        enunciado: d.enunciado.trim(),
        opciones: d.opciones.map((o) => o.trim()),
        competencia: d.competencia?.trim() || null,
        contexto: d.contexto?.trim() || null,
        imagenUrl: d.imagenUrl?.trim() || null,
        explicacion: d.explicacion?.trim() || null,
      });
      this.#ref.close(guardada);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

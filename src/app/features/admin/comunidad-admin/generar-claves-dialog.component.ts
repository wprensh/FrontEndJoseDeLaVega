import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { FiltroClaves, GRADOS, RolCampus, nombreGrado } from '../../../core/models/campus.model';

/** Elige a quiénes generar clave: por rol, grado y grupo. Devuelve el filtro; la página las genera. */
@Component({
  selector: 'app-generar-claves-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Generar claves de acceso</h2>
    <form [formGroup]="formulario" (ngSubmit)="generar()" novalidate>
      <mat-dialog-content>
        <p class="ayuda">
          Cada persona recibe una clave nueva de 8 caracteres para entrar al campus con su documento.
          Las claves se muestran <strong>una sola vez</strong>, listas para imprimir y recortar.
        </p>
        <div class="fila">
          <mat-form-field>
            <mat-label>Quiénes</mat-label>
            <mat-select formControlName="rol">
              <mat-option [value]="null">Estudiantes y docentes</mat-option>
              <mat-option value="Estudiante">Estudiantes</mat-option>
              <mat-option value="Docente">Docentes</mat-option>
            </mat-select>
          </mat-form-field>
          @if (formulario.controls.rol.value !== 'Docente') {
            <mat-form-field>
              <mat-label>Grado</mat-label>
              <mat-select formControlName="grado">
                <mat-option [value]="null">Todos</mat-option>
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Grupo</mat-label>
              <input matInput formControlName="grupo" maxlength="5" placeholder="Todos" autocomplete="off" />
            </mat-form-field>
          }
        </div>
        <mat-checkbox formControlName="soloSinClave">Solo a quienes todavía no tienen clave</mat-checkbox>
        @if (!formulario.controls.soloSinClave.value) {
          <p class="advertencia" role="note">
            <mat-icon aria-hidden="true">warning</mat-icon>
            Quienes ya tenían clave recibirán una nueva y la anterior dejará de servir.
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit">Generar claves</button>
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
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    p {
      margin: 0;
    }

    .ayuda {
      color: var(--jv-texto-suave);
    }

    .advertencia {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--jv-naranja);
      font-size: 0.9rem;
    }
  `,
})
export class GenerarClavesDialogComponent {
  readonly #ref = inject(MatDialogRef<GenerarClavesDialogComponent, FiltroClaves>);

  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    rol: ['Estudiante' as RolCampus | null],
    grado: [null as number | null],
    grupo: [''],
    soloSinClave: [true],
  });

  protected generar(): void {
    const v = this.formulario.getRawValue();
    const docentes = v.rol === 'Docente';
    this.#ref.close({
      rol: v.rol,
      grado: docentes ? null : v.grado,
      grupo: docentes ? null : v.grupo.trim() || null,
      soloSinClave: v.soloSinClave,
    });
  }
}

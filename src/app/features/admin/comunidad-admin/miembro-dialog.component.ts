import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { GRADOS, MiembroCampus, RolCampus, nombreGrado } from '../../../core/models/campus.model';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';

/** Registrar o editar un estudiante o docente del campus. */
@Component({
  selector: 'app-miembro-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ miembro ? 'Editar ' + miembro.nombreCompleto : 'Registrar estudiante o docente' }}</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-button-toggle-group formControlName="rol" aria-label="Rol en el campus">
          <mat-button-toggle value="Estudiante">Estudiante</mat-button-toggle>
          <mat-button-toggle value="Docente">Docente</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field>
          <mat-label>Número de documento</mat-label>
          <input matInput formControlName="documento" autocomplete="off" />
          @if (miembro) {
            <mat-hint>El documento no se cambia: es el usuario de ingreso.</mat-hint>
          } @else {
            <mat-hint>Será el usuario para entrar al campus.</mat-hint>
          }
          @if (formulario.controls.documento.invalid) {
            <mat-error>{{ formulario.controls.documento.getError('servidor') ?? 'Escriba el número de documento.' }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field>
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="nombreCompleto" maxlength="120" autocomplete="off" />
          @if (formulario.controls.nombreCompleto.invalid) {
            <mat-error>{{ formulario.controls.nombreCompleto.getError('servidor') ?? 'Escriba el nombre completo.' }}</mat-error>
          }
        </mat-form-field>

        @if (formulario.controls.rol.value === 'Estudiante') {
          <div class="fila">
            <mat-form-field>
              <mat-label>Grado</mat-label>
              <mat-select formControlName="grado">
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
                }
              </mat-select>
              @if (formulario.controls.grado.invalid) {
                <mat-error>{{ formulario.controls.grado.getError('servidor') ?? 'Elija el grado.' }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field>
              <mat-label>Grupo</mat-label>
              <input matInput formControlName="grupo" maxlength="5" placeholder="A, B, 01..." autocomplete="off" />
              @if (formulario.controls.grupo.invalid) {
                <mat-error>{{ formulario.controls.grupo.getError('servidor') ?? 'Solo letras y números.' }}</mat-error>
              }
            </mat-form-field>
          </div>
        }

        @if (miembro) {
          <mat-slide-toggle formControlName="activo">Puede entrar al campus</mat-slide-toggle>
        }

        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : miembro ? 'Guardar cambios' : 'Registrar' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    mat-button-toggle-group {
      justify-self: start;
    }

    .fila {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class MiembroDialogComponent {
  readonly #servicio = inject(ComunidadService);
  readonly #ref = inject(MatDialogRef<MiembroDialogComponent, MiembroCampus>);
  protected readonly miembro = inject<MiembroCampus | null>(MAT_DIALOG_DATA);

  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    rol: [this.miembro?.rol ?? ('Estudiante' as RolCampus)],
    documento: [{ value: this.miembro?.documento ?? '', disabled: this.miembro !== null }, Validators.required],
    nombreCompleto: [this.miembro?.nombreCompleto ?? '', [Validators.required, Validators.maxLength(120)]],
    grado: [this.miembro?.grado ?? (null as number | null)],
    grupo: [this.miembro?.grupo ?? '', Validators.pattern(/^[A-Za-z0-9]{0,5}$/)],
    activo: [this.miembro?.activo ?? true],
  });

  protected async guardar(): Promise<void> {
    const valor = this.formulario.getRawValue();
    const esEstudiante = valor.rol === 'Estudiante';
    if (esEstudiante && valor.grado === null) {
      this.formulario.controls.grado.setErrors({ required: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = {
      rol: valor.rol,
      nombreCompleto: valor.nombreCompleto.trim(),
      grado: esEstudiante ? valor.grado : null,
      grupo: esEstudiante ? valor.grupo.trim() || null : null,
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardado = this.miembro
        ? await this.#servicio.actualizar(this.miembro.id, { ...datos, activo: valor.activo })
        : await this.#servicio.crear({ ...datos, documento: valor.documento.trim() });
      this.#ref.close(guardado);
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.guardando.set(false);
    }
  }
}

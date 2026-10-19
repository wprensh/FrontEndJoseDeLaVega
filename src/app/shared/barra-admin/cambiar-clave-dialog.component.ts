import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PATRON_CLAVE } from '../../core/models/usuario.model';
import { SesionService } from '../../core/services/sesion.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../core/utils/http-error';

/** El usuario de la sesión cambia su propia contraseña. */
@Component({
  selector: 'app-cambiar-clave-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Cambiar contraseña</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Contraseña actual</mat-label>
          <input matInput type="password" formControlName="claveActual" autocomplete="current-password" />
          @if (formulario.controls.claveActual.hasError('required')) {
            <mat-error>Escriba su contraseña actual.</mat-error>
          } @else if (formulario.controls.claveActual.hasError('servidor')) {
            <mat-error>{{ formulario.controls.claveActual.getError('servidor') }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Contraseña nueva</mat-label>
          <input matInput type="password" formControlName="claveNueva" autocomplete="new-password" />
          <mat-hint>Mínimo 8 caracteres, con letras y números.</mat-hint>
          @if (formulario.controls.claveNueva.invalid) {
            <mat-error>
              {{ formulario.controls.claveNueva.getError('servidor') ?? 'Mínimo 8 caracteres, con letras y números.' }}
            </mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Repita la contraseña nueva</mat-label>
          <input matInput type="password" formControlName="confirmacion" autocomplete="new-password" />
          @if (formulario.controls.confirmacion.hasError('noCoincide')) {
            <mat-error>Las contraseñas no coinciden.</mat-error>
          }
        </mat-form-field>
        <p class="nota">Al cambiarla se cierran sus sesiones abiertas en otros equipos.</p>
        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
      padding-block-start: 0.5rem;
    }

    .nota {
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }
  `,
})
export class CambiarClaveDialogComponent {
  readonly #sesion = inject(SesionService);
  readonly #ref = inject(MatDialogRef<CambiarClaveDialogComponent>);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    claveActual: ['', Validators.required],
    claveNueva: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
    confirmacion: ['', Validators.required],
  });

  protected async guardar(): Promise<void> {
    const { claveActual, claveNueva, confirmacion } = this.formulario.getRawValue();
    if (claveNueva !== confirmacion) {
      this.formulario.controls.confirmacion.setErrors({ noCoincide: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.#sesion.cambiarClave(claveActual, claveNueva);
      this.#snackBar.open('Contraseña actualizada.', 'Cerrar');
      this.#ref.close(true);
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.guardando.set(false);
    }
  }
}

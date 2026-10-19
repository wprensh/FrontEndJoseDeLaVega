import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { PATRON_CLAVE, Usuario } from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';

/** Asigna una contraseña nueva a otro usuario (p. ej. si la olvidó). También lo desbloquea. */
@Component({
  selector: 'app-restablecer-clave-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Restablecer contraseña</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <p>
          Nueva contraseña para <strong>{{ usuario.nombreCompleto }}</strong> ({{ usuario.nombreUsuario }}).
          Sus sesiones abiertas se cerrarán.
        </p>
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
          <mat-label>Repita la contraseña</mat-label>
          <input matInput type="password" formControlName="confirmacion" autocomplete="new-password" />
          @if (formulario.controls.confirmacion.hasError('noCoincide')) {
            <mat-error>Las contraseñas no coinciden.</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : 'Restablecer' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    p {
      margin: 0;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class RestablecerClaveDialogComponent {
  readonly #servicio = inject(UsuariosService);
  readonly #ref = inject(MatDialogRef<RestablecerClaveDialogComponent, boolean>);
  protected readonly usuario = inject<Usuario>(MAT_DIALOG_DATA);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    claveNueva: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
    confirmacion: ['', Validators.required],
  });

  protected async guardar(): Promise<void> {
    const { claveNueva, confirmacion } = this.formulario.getRawValue();
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
      await this.#servicio.restablecerClave(this.usuario.id, claveNueva);
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

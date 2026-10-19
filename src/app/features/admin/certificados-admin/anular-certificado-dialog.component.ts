import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Certificado } from '../../../core/models/certificado.model';

/** Pide el motivo de la anulación. Devuelve el motivo al confirmar, o nada si se cancela. */
@Component({
  selector: 'app-anular-certificado-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Anular certificado</h2>
    <mat-dialog-content>
      <p>
        El certificado <strong>{{ data.codigo }}</strong> de {{ data.nombreBeneficiario }} quedará anulado: al
        verificar su código, el sitio informará que ya no es válido. Esta acción no se puede deshacer.
      </p>
      <mat-form-field class="motivo">
        <mat-label>Motivo de la anulación</mat-label>
        <textarea matInput [formControl]="motivo" rows="3" maxlength="300" cdkFocusInitial></textarea>
        @if (motivo.hasError('required') && motivo.touched) {
          <mat-error>Indique el motivo.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button class="peligro" type="button" (click)="confirmar()">Anular</button>
    </mat-dialog-actions>
  `,
  styles: `
    .motivo { inline-size: 100%; }
    .peligro {
      --mdc-filled-button-container-color: var(--jv-rojo);
      --mdc-filled-button-label-text-color: #fff;
    }
  `,
})
export class AnularCertificadoDialogComponent {
  readonly #ref = inject<MatDialogRef<AnularCertificadoDialogComponent, string>>(MatDialogRef);
  protected readonly data = inject<Certificado>(MAT_DIALOG_DATA);
  protected readonly motivo = inject(NonNullableFormBuilder).control('', [Validators.required, Validators.maxLength(300)]);

  protected confirmar(): void {
    if (this.motivo.invalid || !this.motivo.value.trim()) {
      this.motivo.setErrors({ required: true });
      this.motivo.markAsTouched();
      return;
    }
    this.#ref.close(this.motivo.value.trim());
  }
}

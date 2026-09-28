import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  confirmar?: string;
}

/** Diálogo genérico de confirmación. Devuelve `true` al cerrar si el usuario confirma. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>{{ data.mensaje }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button class="peligro" [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.confirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .peligro {
      --mdc-filled-button-container-color: var(--jv-rojo);
      --mdc-filled-button-label-text-color: #fff;
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

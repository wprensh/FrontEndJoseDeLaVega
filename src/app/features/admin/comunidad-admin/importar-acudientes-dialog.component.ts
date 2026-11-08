import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ResultadoImportacionAcudientes, leerListaAcudientes } from '../../../core/models/campus.model';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Importa acudientes desde Excel y los vincula con sus estudiantes (que ya deben estar registrados). */
@Component({
  selector: 'app-importar-acudientes-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Importar acudientes</h2>
    <mat-dialog-content>
      @if (resultado(); as r) {
        <p class="exito" role="status">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          {{ r.acudientesCreados }} acudientes registrados, {{ r.acudientesActualizados }} actualizados y {{ r.vinculos }} vínculos con estudiantes.
        </p>
        @if (r.errores.length) {
          <p>Estas filas no se importaron:</p>
          <ul class="errores">
            @for (e of r.errores; track e.fila) {
              <li>Fila {{ e.fila }}{{ e.documento ? ' (' + e.documento + ')' : '' }}: {{ e.mensaje }}</li>
            }
          </ul>
        }
        <p class="ayuda">Ahora genere las claves de los acudientes (filtro Rol: Acudientes) para entregarlas en la reunión de padres.</p>
      } @else {
        <p class="ayuda">
          Copie las columnas desde Excel y péguelas aquí, una fila por cada acudiente y estudiante:
          <strong>documento del acudiente, nombre del acudiente, documento del estudiante, parentesco, correo, celular</strong>.
          Las tres últimas son opcionales. Si un acudiente tiene dos hijos, repita la fila con el otro documento.
        </p>
        <mat-form-field>
          <mat-label>Lista</mat-label>
          <textarea matInput rows="10" [(ngModel)]="texto" placeholder="45123456	María Pérez	1043555123	Madre	maria@correo.com	3001234567"></textarea>
          <mat-hint>{{ filas().length }} filas</mat-hint>
        </mat-form-field>
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (resultado()) {
        <button mat-flat-button class="boton-azul" type="button" [mat-dialog-close]="true">Listo</button>
      } @else {
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="button" [disabled]="importando() || !filas().length" (click)="importar()">
          {{ importando() ? 'Importando...' : 'Importar ' + filas().length + ' filas' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.5rem;
    }

    textarea {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
    }

    .ayuda {
      margin: 0;
      color: var(--jv-texto-suave);
    }

    .exito {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #0f5d31;
      font-weight: 600;
    }

    .errores {
      max-block-size: 12rem;
      overflow: auto;
      color: var(--jv-rojo);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ImportarAcudientesDialogComponent {
  readonly #servicio = inject(ComunidadService);

  protected readonly texto = signal('');
  protected readonly filas = computed(() => leerListaAcudientes(this.texto()));
  protected readonly importando = signal(false);
  protected readonly resultado = signal<ResultadoImportacionAcudientes | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async importar(): Promise<void> {
    this.importando.set(true);
    this.error.set(null);
    try {
      this.resultado.set(await this.#servicio.importarAcudientes(this.filas()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.importando.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { ResultadoImportacion, RolCampus, leerLista } from '../../../core/models/campus.model';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Importa una lista pegada desde Excel o del SIMAT: crea a los nuevos y actualiza grado y grupo de los demás. */
@Component({
  selector: 'app-importar-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Importar lista</h2>
    <mat-dialog-content>
      @if (resultado(); as r) {
        <p class="exito" role="status">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          {{ r.creados }} registrados y {{ r.actualizados }} actualizados.
        </p>
        @if (r.errores.length) {
          <p>Estas filas no se importaron:</p>
          <ul class="errores">
            @for (e of r.errores; track e.fila) {
              <li>Fila {{ e.fila }}{{ e.documento ? ' (' + e.documento + ')' : '' }}: {{ e.mensaje }}</li>
            }
          </ul>
        }
        <p class="ayuda">Ahora genere las claves de acceso para entregarlas.</p>
      } @else {
        <mat-button-toggle-group [(ngModel)]="rol" aria-label="Tipo de lista">
          <mat-button-toggle value="Estudiante">Estudiantes</mat-button-toggle>
          <mat-button-toggle value="Docente">Docentes</mat-button-toggle>
        </mat-button-toggle-group>

        <p class="ayuda">
          Copie las columnas desde Excel y péguelas aquí, una persona por línea:
          <strong>{{ rol() === 'Estudiante' ? 'documento, nombre completo, grado, grupo' : 'documento, nombre completo' }}</strong>.
          El grado va de 0 (transición) a 11. Si alguien ya existe, se actualizan su nombre, grado y grupo.
        </p>

        <mat-form-field>
          <mat-label>Lista</mat-label>
          <textarea
            matInput
            rows="10"
            [(ngModel)]="texto"
            [placeholder]="rol() === 'Estudiante' ? '1043555123\tAna María Pérez\t11\tA' : '73123456\tCarlos Gómez'"
          ></textarea>
          <mat-hint>{{ filas().length }} {{ filas().length === 1 ? 'persona' : 'personas' }} en la lista</mat-hint>
        </mat-form-field>

        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (resultado()) {
        <button mat-flat-button class="boton-azul" type="button" (click)="cerrar()">Listo</button>
      } @else {
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="button" [disabled]="importando() || !filas().length" (click)="importar()">
          {{ importando() ? 'Importando...' : 'Importar' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    mat-button-toggle-group {
      justify-self: start;
    }

    p {
      margin: 0;
    }

    .ayuda {
      color: var(--jv-texto-suave);
      font-size: 0.9rem;
    }

    textarea {
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
    }

    .exito {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1e7a3c;
      font-weight: 600;
    }

    .errores {
      margin: 0;
      max-block-size: 12rem;
      overflow: auto;
      color: var(--jv-rojo);
      font-size: 0.88rem;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ImportarDialogComponent {
  readonly #servicio = inject(ComunidadService);
  readonly #ref = inject(MatDialogRef<ImportarDialogComponent, boolean>);

  protected readonly rol = signal<RolCampus>('Estudiante');
  protected readonly texto = signal('');
  protected readonly filas = computed(() => leerLista(this.texto(), this.rol()));
  protected readonly importando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<ResultadoImportacion | null>(null);

  protected async importar(): Promise<void> {
    this.importando.set(true);
    this.error.set(null);
    try {
      this.resultado.set(await this.#servicio.importar(this.rol(), this.filas()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.importando.set(false);
    }
  }

  protected cerrar(): void {
    this.#ref.close(true);
  }
}

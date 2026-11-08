import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { Circular, PUBLICOS_CIRCULAR, PublicoCircular } from '../../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../../core/services/comunicaciones.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Redactar o editar una circular. Se publica aparte, desde la lista. */
@Component({
  selector: 'app-circular-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ circular ? 'Editar ' + circular.codigo : 'Nueva circular' }}</h2>
    <form (ngSubmit)="guardar()">
      <mat-dialog-content>
        @if (circular?.publicadaEn) {
          <p class="aviso">Esta circular ya está publicada: los cambios se verán en el campus, pero no se reenvían correos.</p>
        }
        <mat-form-field>
          <mat-label>Asunto</mat-label>
          <input matInput name="titulo" maxlength="200" required [(ngModel)]="datos.titulo" placeholder="Entrega de boletines del primer periodo" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Contenido</mat-label>
          <textarea matInput name="contenido" rows="9" maxlength="10000" required [(ngModel)]="datos.contenido"></textarea>
        </mat-form-field>
        <div class="fila">
          <mat-form-field>
            <mat-label>Dirigida a</mat-label>
            <mat-select name="publico" [(ngModel)]="datos.publico">
              @for (p of publicos; track p[0]) {
                <mat-option [value]="p[0]">{{ p[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Enlace a un documento (opcional)</mat-label>
            <input matInput type="url" name="enlace" maxlength="500" [(ngModel)]="datos.enlaceAdjunto" placeholder="https://drive.google.com/..." />
          </mat-form-field>
        </div>
        @if (datos.publico !== 'Docentes') {
          <fieldset>
            <legend>Grados (sin marcar = todos)</legend>
            @for (g of grados; track g) {
              <mat-checkbox [checked]="datos.grados.includes(g)" (change)="alternarGrado(g, $event.checked)">{{ nombreGrado(g) }}</mat-checkbox>
            }
          </fieldset>
        }
        <mat-slide-toggle name="confirmacion" [(ngModel)]="datos.requiereConfirmacion">
          Pedir confirmación de lectura («Enterado»)
        </mat-slide-toggle>
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando...' : 'Guardar borrador' }}</button>
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

      @media (width < 600px) {
        grid-template-columns: 1fr;
      }
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

    .aviso {
      margin: 0;
      padding: 0.5rem 0.75rem;
      background: #fff6e0;
      border-radius: var(--jv-radio);
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class CircularDialogComponent {
  readonly #servicio = inject(ComunicacionesService);
  readonly #ref = inject(MatDialogRef<CircularDialogComponent, Circular>);
  protected readonly circular = inject<Circular | null>(MAT_DIALOG_DATA);

  protected readonly publicos = Object.entries(PUBLICOS_CIRCULAR) as [PublicoCircular, string][];
  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly datos = {
    titulo: this.circular?.titulo ?? '',
    contenido: this.circular?.contenido ?? '',
    publico: this.circular?.publico ?? ('Familias' as PublicoCircular),
    grados: [...(this.circular?.grados ?? [])],
    requiereConfirmacion: this.circular?.requiereConfirmacion ?? true,
    enlaceAdjunto: this.circular?.enlaceAdjunto ?? '',
  };

  protected alternarGrado(grado: number, marcado: boolean): void {
    this.datos.grados = marcado
      ? [...new Set([...this.datos.grados, grado])].sort((a, b) => a - b)
      : this.datos.grados.filter((g) => g !== grado);
  }

  protected async guardar(): Promise<void> {
    if (!this.datos.titulo.trim() || !this.datos.contenido.trim()) {
      this.error.set('Escriba el asunto y el contenido.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardada = await this.#servicio.guardarCircular(this.circular?.id ?? null, {
        titulo: this.datos.titulo.trim(),
        contenido: this.datos.contenido.trim(),
        publico: this.datos.publico,
        grados: this.datos.publico === 'Docentes' || !this.datos.grados.length ? null : this.datos.grados,
        requiereConfirmacion: this.datos.requiereConfirmacion,
        enlaceAdjunto: this.datos.enlaceAdjunto.trim() || null,
      });
      this.#ref.close(guardada);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

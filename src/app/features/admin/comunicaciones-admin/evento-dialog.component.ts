import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { hoyColombia } from '../../../core/models/academico.model';
import { Evento, TIPOS_EVENTO, TipoEvento } from '../../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../../core/services/comunicaciones.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Crear o editar un evento del calendario escolar. */
@Component({
  selector: 'app-evento-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{ evento ? 'Editar evento' : 'Nuevo evento' }}</h2>
    <form (ngSubmit)="guardar()">
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Nombre</mat-label>
          <input matInput name="titulo" maxlength="150" required [(ngModel)]="datos.titulo" placeholder="Entrega de boletines" />
        </mat-form-field>
        <div class="fila">
          <mat-form-field>
            <mat-label>Tipo</mat-label>
            <mat-select name="tipo" [(ngModel)]="datos.tipo">
              @for (t of tipos; track t[0]) {
                <mat-option [value]="t[0]">{{ t[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Hora (opcional)</mat-label>
            <input matInput name="hora" maxlength="50" [(ngModel)]="datos.hora" placeholder="7:00 a. m." />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Desde</mat-label>
            <input matInput type="date" name="inicio" required [(ngModel)]="datos.inicio" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Hasta (opcional)</mat-label>
            <input matInput type="date" name="fin" [min]="datos.inicio" [(ngModel)]="datos.fin" />
          </mat-form-field>
        </div>
        <mat-form-field>
          <mat-label>Lugar (opcional)</mat-label>
          <input matInput name="lugar" maxlength="150" [(ngModel)]="datos.lugar" placeholder="Sede principal" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Descripción (opcional)</mat-label>
          <textarea matInput name="descripcion" rows="3" maxlength="2000" [(ngModel)]="datos.descripcion"></textarea>
        </mat-form-field>
        <mat-slide-toggle name="publico" [(ngModel)]="datos.publico">
          Mostrar en la página pública (si no, solo se ve en el campus)
        </mat-slide-toggle>
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
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
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class EventoDialogComponent {
  readonly #servicio = inject(ComunicacionesService);
  readonly #ref = inject(MatDialogRef<EventoDialogComponent, Evento>);
  protected readonly evento = inject<Evento | null>(MAT_DIALOG_DATA);

  protected readonly tipos = Object.entries(TIPOS_EVENTO) as [TipoEvento, string][];
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly datos = {
    titulo: this.evento?.titulo ?? '',
    descripcion: this.evento?.descripcion ?? '',
    inicio: this.evento?.inicio ?? hoyColombia(),
    fin: this.evento && this.evento.fin !== this.evento.inicio ? this.evento.fin : '',
    hora: this.evento?.hora ?? '',
    lugar: this.evento?.lugar ?? '',
    tipo: this.evento?.tipo ?? ('Institucional' as TipoEvento),
    publico: this.evento?.publico ?? true,
  };

  protected async guardar(): Promise<void> {
    if (!this.datos.titulo.trim() || !this.datos.inicio) {
      this.error.set('Escriba el nombre y la fecha.');
      return;
    }
    if (this.datos.fin && this.datos.fin < this.datos.inicio) {
      this.error.set('La fecha final debe ser igual o posterior a la inicial.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardado = await this.#servicio.guardarEvento(this.evento?.id ?? null, {
        titulo: this.datos.titulo.trim(),
        descripcion: this.datos.descripcion.trim() || null,
        inicio: this.datos.inicio,
        fin: this.datos.fin || null,
        hora: this.datos.hora.trim() || null,
        lugar: this.datos.lugar.trim() || null,
        tipo: this.datos.tipo,
        publico: this.datos.publico,
      });
      this.#ref.close(guardado);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

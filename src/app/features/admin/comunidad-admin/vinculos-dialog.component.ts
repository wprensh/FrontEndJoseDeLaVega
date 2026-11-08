import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MiembroCampus, Vinculo, cursoDe } from '../../../core/models/campus.model';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Acudientes de un estudiante, o estudiantes a cargo de un acudiente. */
@Component({
  selector: 'app-vinculos-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ esAcudiente ? 'Estudiantes a cargo de' : 'Acudientes de' }} {{ miembro.nombreCompleto }}</h2>
    <mat-dialog-content>
      <ul class="vinculos">
        @for (v of vinculos(); track v.id) {
          <li>
            <mat-icon aria-hidden="true">{{ esAcudiente ? 'school' : 'family_restroom' }}</mat-icon>
            <div>
              @if (esAcudiente) {
                <strong>{{ v.estudianteNombre }}</strong>
                <span>{{ cursoDe(v) }} · Doc. {{ v.estudianteDocumento }}{{ v.parentesco ? ' · ' + v.parentesco : '' }}</span>
              } @else {
                <strong>{{ v.acudienteNombre }}{{ v.parentesco ? ' (' + v.parentesco + ')' : '' }}</strong>
                <span>
                  Doc. {{ v.acudienteDocumento }}
                  @if (v.acudienteTelefono) { · {{ v.acudienteTelefono }} }
                  @if (v.acudienteCorreo) { · {{ v.acudienteCorreo }} }
                </span>
              }
            </div>
            @if (puedeEditar) {
              <button mat-icon-button type="button" matTooltip="Quitar vínculo" aria-label="Quitar vínculo" (click)="quitar(v)">
                <mat-icon>link_off</mat-icon>
              </button>
            }
          </li>
        } @empty {
          <li class="vacio">{{ esAcudiente ? 'Aún no tiene estudiantes vinculados.' : 'Aún no tiene acudientes registrados.' }}</li>
        }
      </ul>

      @if (puedeEditar) {
        <form class="agregar" (ngSubmit)="agregar()">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Documento del {{ esAcudiente ? 'estudiante' : 'acudiente' }}</mat-label>
            <input matInput name="documento" [(ngModel)]="documento" autocomplete="off" required />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Parentesco</mat-label>
            <input matInput name="parentesco" [(ngModel)]="parentesco" maxlength="30" placeholder="Madre, padre, abuela..." />
          </mat-form-field>
          <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando() || !documento.trim()">
            <mat-icon aria-hidden="true">add_link</mat-icon>
            Vincular
          </button>
        </form>
        @if (!esAcudiente) {
          <p class="ayuda">El acudiente debe estar registrado antes con el rol «Acudiente».</p>
        }
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .vinculos {
      display: grid;
      gap: 0.5rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--jv-borde);
        border-radius: var(--jv-radio);
      }

      div {
        display: grid;
        flex: 1;
      }

      span {
        color: var(--jv-texto-suave);
        font-size: 0.88rem;
      }

      .vacio {
        color: var(--jv-texto-suave);
      }
    }

    .agregar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .ayuda {
      color: var(--jv-texto-suave);
      font-size: 0.88rem;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class VinculosDialogComponent implements OnInit {
  readonly #servicio = inject(ComunidadService);
  protected readonly miembro = inject<MiembroCampus>(MAT_DIALOG_DATA);
  protected readonly esAcudiente = this.miembro.rol === 'Acudiente';
  protected readonly puedeEditar = inject(SesionService).puede('Campus', 'Editar');
  protected readonly cursoDe = cursoDe;

  protected readonly vinculos = signal<Vinculo[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected documento = '';
  protected parentesco = '';

  async ngOnInit(): Promise<void> {
    try {
      this.vinculos.set(await this.#servicio.vinculos(this.miembro.id));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected async agregar(): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    try {
      const vinculo = await this.#servicio.vincular(this.miembro.id, this.documento.trim(), this.parentesco.trim() || null);
      this.vinculos.update((lista) => [...lista.filter((v) => v.id !== vinculo.id), vinculo]);
      this.documento = '';
      this.parentesco = '';
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async quitar(vinculo: Vinculo): Promise<void> {
    this.error.set(null);
    try {
      await this.#servicio.desvincular(this.miembro.id, vinculo.id);
      this.vinculos.update((lista) => lista.filter((v) => v.id !== vinculo.id));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}

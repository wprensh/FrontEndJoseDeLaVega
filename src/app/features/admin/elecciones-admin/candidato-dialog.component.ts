import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { cursoDe } from '../../../core/models/campus.model';
import { Aspirante, Candidato, CargoEleccion, infoCargo } from '../../../core/models/eleccion.model';
import { EleccionesService } from '../../../core/services/elecciones.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';
import { FotoCandidatoComponent } from '../../../shared/elecciones/foto-candidato.component';

export interface CandidatoDialogData {
  readonly eleccionId: string;
  readonly cargo: CargoEleccion;
  readonly candidato?: Candidato;
}

/** URL http(s) o ruta del sitio, como en las noticias. */
const PATRON_URL = /^(https?:\/\/\S+|\/(?!\/)(?!.*\.\.)\S+)$/i;

/** Inscribe un estudiante a un cargo o edita su perfil de campaña (número, lema, propuestas y foto). */
@Component({
  selector: 'app-candidato-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FotoCandidatoComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ datos.candidato ? 'Perfil de ' + datos.candidato.nombreCompleto : 'Inscribir candidato' }}</h2>
    <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
      <mat-dialog-content>
        <p class="cargo">{{ cargo.nombre }} · Candidatos: {{ cargo.quienes.toLowerCase() }}</p>

        @if (!datos.candidato) {
          <mat-form-field>
            <mat-label>Estudiante</mat-label>
            <input
              matInput
              [matAutocomplete]="lista"
              [value]="textoBusqueda()"
              (input)="buscar($any($event.target).value)"
              placeholder="Escriba el nombre o el documento"
              autocomplete="off"
            />
            <mat-autocomplete #lista="matAutocomplete" [displayWith]="mostrar" (optionSelected)="elegir($event)">
              @for (a of aspirantes(); track a.id) {
                <mat-option [value]="a">
                  {{ a.nombreCompleto }} · {{ curso(a) }} · {{ a.documento }}
                </mat-option>
              } @empty {
                @if (!buscando()) {
                  <mat-option disabled>No hay estudiantes que cumplan el grado del cargo.</mat-option>
                }
              }
            </mat-autocomplete>
            <mat-hint>Solo aparecen estudiantes activos del grado que exige el cargo.</mat-hint>
            @if (formulario.controls.estudianteId.invalid && formulario.controls.estudianteId.touched) {
              <mat-error>{{ formulario.controls.estudianteId.getError('servidor') ?? 'Elija un estudiante de la lista.' }}</mat-error>
            }
          </mat-form-field>
        }

        <div class="perfil">
          <app-foto-candidato
            [nombre]="datos.candidato?.nombreCompleto ?? elegido()?.nombreCompleto ?? '?'"
            [fotoUrl]="formulario.controls.fotoUrl.valid ? formulario.controls.fotoUrl.value || null : null"
          />
          <div class="campos">
            <mat-form-field class="numero">
              <mat-label>N.° en el tarjetón</mat-label>
              <input matInput type="number" min="1" max="99" formControlName="numero" />
              @if (!datos.candidato) {
                <mat-hint>Vacío: el siguiente libre</mat-hint>
              }
              @if (formulario.controls.numero.invalid) {
                <mat-error>{{ formulario.controls.numero.getError('servidor') ?? 'De 1 a 99.' }}</mat-error>
              }
            </mat-form-field>
            <mat-form-field>
              <mat-label>Foto (opcional)</mat-label>
              <input matInput formControlName="fotoUrl" placeholder="/img/candidatos/nombre.jpg o https://..." />
              <mat-hint>Ruta del sitio (/img/candidatos/...) o dirección de la imagen.</mat-hint>
              @if (formulario.controls.fotoUrl.invalid) {
                <mat-error>{{ formulario.controls.fotoUrl.getError('servidor') ?? 'Use https://... o una ruta que empiece por /' }}</mat-error>
              }
            </mat-form-field>
          </div>
        </div>

        <mat-form-field>
          <mat-label>Lema de campaña</mat-label>
          <input matInput formControlName="lema" maxlength="150" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Propuestas</mat-label>
          <textarea matInput formControlName="propuestas" rows="6" maxlength="4000" placeholder="Una propuesta por línea"></textarea>
          <mat-hint align="end">{{ formulario.controls.propuestas.value.length }} / 4000</mat-hint>
        </mat-form-field>

        @if (error()) {
          <p class="aviso-error" role="alert">{{ error() }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button class="boton-azul" type="submit" [disabled]="guardando()">
          {{ guardando() ? 'Guardando...' : datos.candidato ? 'Guardar perfil' : 'Inscribir' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: grid;
      gap: 0.75rem;
    }

    .cargo {
      margin: 0;
      color: var(--jv-texto-suave);
    }

    .perfil {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .campos {
      flex: 1;
      display: grid;
      gap: 0.75rem;
    }

    .numero {
      max-inline-size: 180px;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class CandidatoDialogComponent implements OnInit {
  readonly #servicio = inject(EleccionesService);
  readonly #ref = inject(MatDialogRef<CandidatoDialogComponent, Candidato>);
  protected readonly datos = inject<CandidatoDialogData>(MAT_DIALOG_DATA);
  protected readonly cargo = infoCargo(this.datos.cargo);
  protected readonly curso = (a: Aspirante) => cursoDe({ rol: 'Estudiante', grado: a.grado, grupo: a.grupo });
  protected readonly mostrar = (a: Aspirante | string | null) =>
    a && typeof a === 'object' ? `${a.nombreCompleto} · ${this.curso(a)}` : (a ?? '');

  protected readonly aspirantes = signal<Aspirante[]>([]);
  protected readonly elegido = signal<Aspirante | null>(null);
  protected readonly textoBusqueda = signal('');
  protected readonly buscando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  #consulta = 0;

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    estudianteId: [this.datos.candidato?.estudianteId ?? '', Validators.required],
    numero: [this.datos.candidato?.numero ?? (null as number | null), [Validators.min(1), Validators.max(99)]],
    lema: [this.datos.candidato?.lema ?? ''],
    propuestas: [this.datos.candidato?.propuestas ?? ''],
    fotoUrl: [this.datos.candidato?.fotoUrl ?? '', Validators.pattern(PATRON_URL)],
  });

  ngOnInit(): void {
    if (!this.datos.candidato) {
      void this.buscar('');
    }
  }

  protected async buscar(texto: string): Promise<void> {
    this.textoBusqueda.set(texto);
    this.elegido.set(null);
    this.formulario.controls.estudianteId.setValue('');
    const consulta = ++this.#consulta;
    this.buscando.set(true);
    try {
      const lista = await this.#servicio.aspirantes(this.datos.eleccionId, this.datos.cargo, texto.trim());
      if (consulta === this.#consulta) {
        this.aspirantes.set(lista);
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      if (consulta === this.#consulta) {
        this.buscando.set(false);
      }
    }
  }

  protected elegir(evento: MatAutocompleteSelectedEvent): void {
    const aspirante = evento.option.value as Aspirante;
    this.elegido.set(aspirante);
    this.textoBusqueda.set(this.mostrar(aspirante));
    this.formulario.controls.estudianteId.setValue(aspirante.id);
  }

  protected async guardar(): Promise<void> {
    if (this.datos.candidato && this.formulario.controls.numero.value === null) {
      this.formulario.controls.numero.setErrors({ required: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.getRawValue();
    const perfil = {
      lema: v.lema.trim() || null,
      propuestas: v.propuestas.trim() || null,
      fotoUrl: v.fotoUrl.trim() || null,
    };

    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardado = this.datos.candidato
        ? await this.#servicio.actualizarCandidato(this.datos.eleccionId, this.datos.candidato.id, { ...perfil, numero: v.numero! })
        : await this.#servicio.crearCandidato(this.datos.eleccionId, {
            ...perfil,
            cargo: this.datos.cargo,
            estudianteId: v.estudianteId,
            numero: v.numero,
          });
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

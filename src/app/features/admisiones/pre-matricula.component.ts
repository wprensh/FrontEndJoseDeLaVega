import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { hoyColombia } from '../../core/models/academico.model';
import { GRADOS, nombreGrado } from '../../core/models/campus.model';
import {
  AdmisionRadicada,
  RadicarAdmision,
  TIPOS_DOCUMENTO_ASPIRANTE,
  TipoDocumentoAspirante,
} from '../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../core/services/comunicaciones.service';
import { mensajesDeError } from '../../core/utils/http-error';

/** Formulario público de pre-matrícula: la familia radica la solicitud y recibe un número de radicado. */
@Component({
  selector: 'app-pre-matricula',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    @if (radicada(); as r) {
      <div class="exito" role="status">
        <mat-icon aria-hidden="true">task_alt</mat-icon>
        <h3>¡Solicitud radicada!</h3>
        <p>Guarde este número. Con él y el documento del aspirante puede consultar el estado y cargar los documentos.</p>
        <p class="radicado">{{ r.radicado }}</p>
        <p class="detalle">Radicada el {{ r.radicadaEn | date: "d 'de' MMMM 'de' y, h:mm a" }}</p>
        <div class="acciones">
          <button mat-flat-button class="boton-azul" type="button" (click)="consultar.emit({ radicado: r.radicado, documento: documentoRadicado })">
            Cargar documentos ahora
          </button>
          <button mat-button type="button" (click)="nueva()">Radicar otra solicitud</button>
        </div>
      </div>
    } @else {
      <form #formulario="ngForm" (ngSubmit)="radicar(formulario)">
        <fieldset>
          <legend>Cupo solicitado</legend>
          <div class="rejilla">
            <mat-form-field>
              <mat-label>Año lectivo</mat-label>
              <mat-select name="anio" [(ngModel)]="datos.anioLectivo" required>
                @for (a of anios; track a) {
                  <mat-option [value]="a">{{ a }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Grado al que aspira</mat-label>
              <mat-select name="grado" [(ngModel)]="datos.gradoSolicitado" required>
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </fieldset>

        <fieldset>
          <legend>Datos del aspirante</legend>
          <div class="rejilla">
            <mat-form-field>
              <mat-label>Nombres</mat-label>
              <input matInput name="nombres" maxlength="100" required autocomplete="off" [(ngModel)]="datos.aspiranteNombres" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Apellidos</mat-label>
              <input matInput name="apellidos" maxlength="100" required autocomplete="off" [(ngModel)]="datos.aspiranteApellidos" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Tipo de documento</mat-label>
              <mat-select name="tipoDocumento" [(ngModel)]="datos.aspiranteTipoDocumento" required>
                @for (t of tiposDocumento; track t[0]) {
                  <mat-option [value]="t[0]">{{ t[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Número de documento</mat-label>
              <input matInput name="documento" maxlength="20" required inputmode="numeric" autocomplete="off" [(ngModel)]="datos.aspiranteDocumento" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Fecha de nacimiento</mat-label>
              <input matInput type="date" name="nacimiento" required [max]="hoy" [(ngModel)]="datos.aspiranteFechaNacimiento" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Colegio de procedencia (opcional)</mat-label>
              <input matInput name="colegio" maxlength="150" [(ngModel)]="datos.colegioProcedencia" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>EPS o SISBÉN (opcional)</mat-label>
              <input matInput name="eps" maxlength="150" [(ngModel)]="datos.eps" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Dirección y barrio (opcional)</mat-label>
              <input matInput name="direccion" maxlength="150" autocomplete="street-address" [(ngModel)]="datos.direccion" />
            </mat-form-field>
          </div>
        </fieldset>

        <fieldset>
          <legend>Acudiente</legend>
          <div class="rejilla">
            <mat-form-field>
              <mat-label>Nombre completo</mat-label>
              <input matInput name="acudiente" maxlength="150" required autocomplete="name" [(ngModel)]="datos.acudienteNombre" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Documento</mat-label>
              <input matInput name="acudienteDocumento" maxlength="20" required inputmode="numeric" [(ngModel)]="datos.acudienteDocumento" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Parentesco (opcional)</mat-label>
              <input matInput name="parentesco" maxlength="50" placeholder="Madre, padre, abuela..." [(ngModel)]="datos.acudienteParentesco" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Celular (WhatsApp)</mat-label>
              <input matInput type="tel" name="telefono" maxlength="20" required autocomplete="tel" [(ngModel)]="datos.acudienteTelefono" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Correo (opcional, para avisos)</mat-label>
              <input matInput type="email" name="correo" maxlength="150" autocomplete="email" [(ngModel)]="datos.acudienteCorreo" />
            </mat-form-field>
          </div>
          <mat-form-field class="completo">
            <mat-label>Observaciones (opcional)</mat-label>
            <textarea matInput name="observaciones" rows="3" maxlength="1000" placeholder="Hermanos en la institución, necesidades educativas, etc." [(ngModel)]="datos.observaciones"></textarea>
          </mat-form-field>
        </fieldset>

        <mat-checkbox name="acepta" [(ngModel)]="datos.aceptaTratamientoDatos" required>
          Autorizo a la institución a tratar estos datos personales para el proceso de admisión, según la Ley 1581 de 2012.
        </mat-checkbox>

        @if (errores().length) {
          <ul class="errores" role="alert">
            @for (e of errores(); track e) {
              <li>{{ e }}</li>
            }
          </ul>
        }

        <div class="acciones">
          <button mat-flat-button class="boton-institucional" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Enviando...' : 'Radicar solicitud' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    form {
      display: grid;
      gap: 1rem;
    }

    fieldset {
      margin: 0;
      padding: 0.75rem 1rem 0.25rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);
    }

    legend {
      padding-inline: 0.4rem;
      color: var(--jv-azul);
      font-weight: 700;
    }

    .rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0 1rem;
    }

    .completo {
      inline-size: 100%;
    }

    .errores {
      margin: 0;
      padding: 0.6rem 0.6rem 0.6rem 1.8rem;
      border-radius: var(--jv-radio);
      background: #fdecec;
      color: var(--jv-rojo);
    }

    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .exito {
      display: grid;
      justify-items: center;
      gap: 0.4rem;
      padding: 1.5rem;
      text-align: center;

      mat-icon {
        inline-size: 48px;
        block-size: 48px;
        font-size: 48px;
        color: #0f7b3f;
      }

      h3,
      p {
        margin: 0;
      }

      .radicado {
        padding: 0.4rem 1rem;
        border: 2px dashed var(--jv-azul);
        border-radius: var(--jv-radio);
        color: var(--jv-azul);
        font: 800 1.6rem / 1.2 ui-monospace, Consolas, monospace;
        letter-spacing: 0.05em;
      }

      .detalle {
        color: var(--jv-texto-suave);
      }
    }
  `,
})
export class PreMatriculaComponent {
  readonly #servicio = inject(ComunicacionesService);

  /** Pide abrir la consulta de la solicitud recién radicada. */
  readonly consultar = output<{ radicado: string; documento: string }>();

  protected readonly hoy = hoyColombia();
  protected readonly anios = ((a) => [a, a + 1])(Number(this.hoy.slice(0, 4)));
  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly tiposDocumento = Object.entries(TIPOS_DOCUMENTO_ASPIRANTE) as [TipoDocumentoAspirante, string][];
  protected readonly enviando = signal(false);
  protected readonly errores = signal<string[]>([]);
  protected readonly radicada = signal<AdmisionRadicada | null>(null);
  protected documentoRadicado = '';

  protected datos = this.#vacio();

  #vacio(): RadicarAdmision {
    const anio = Number(hoyColombia().slice(0, 4));
    // Desde septiembre lo normal es pedir cupo para el año siguiente.
    const mes = Number(hoyColombia().slice(5, 7));
    return {
      anioLectivo: mes >= 9 ? anio + 1 : anio,
      gradoSolicitado: null as unknown as number,
      aspiranteTipoDocumento: 'TarjetaIdentidad',
      aspiranteDocumento: '',
      aspiranteNombres: '',
      aspiranteApellidos: '',
      aspiranteFechaNacimiento: '',
      colegioProcedencia: null,
      direccion: null,
      eps: null,
      acudienteNombre: '',
      acudienteDocumento: '',
      acudienteParentesco: null,
      acudienteTelefono: '',
      acudienteCorreo: null,
      observaciones: null,
      aceptaTratamientoDatos: false,
    };
  }

  protected async radicar(formulario: NgForm): Promise<void> {
    if (formulario.invalid || !this.datos.aceptaTratamientoDatos) {
      formulario.control.markAllAsTouched();
      this.errores.set([
        this.datos.aceptaTratamientoDatos
          ? 'Complete los campos obligatorios marcados en rojo.'
          : 'Complete los campos obligatorios y autorice el tratamiento de datos.',
      ]);
      return;
    }
    const limpio = (v: string | null): string | null => v?.trim() || null;
    this.enviando.set(true);
    this.errores.set([]);
    try {
      const d = this.datos;
      const radicada = await this.#servicio.radicar({
        ...d,
        aspiranteDocumento: d.aspiranteDocumento.trim(),
        aspiranteNombres: d.aspiranteNombres.trim(),
        aspiranteApellidos: d.aspiranteApellidos.trim(),
        colegioProcedencia: limpio(d.colegioProcedencia),
        direccion: limpio(d.direccion),
        eps: limpio(d.eps),
        acudienteNombre: d.acudienteNombre.trim(),
        acudienteDocumento: d.acudienteDocumento.trim(),
        acudienteParentesco: limpio(d.acudienteParentesco),
        acudienteTelefono: d.acudienteTelefono.trim(),
        acudienteCorreo: limpio(d.acudienteCorreo),
        observaciones: limpio(d.observaciones),
      });
      this.documentoRadicado = d.aspiranteDocumento.trim();
      this.radicada.set(radicada);
    } catch (error) {
      this.errores.set(mensajesDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  protected nueva(): void {
    this.datos = this.#vacio();
    this.radicada.set(null);
  }
}

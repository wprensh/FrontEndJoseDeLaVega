import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { nombreGrado } from '../../core/models/campus.model';
import {
  ESTADOS_ADMISION,
  EstadoAdmisionConsulta,
  TAMANO_MAXIMO_DOCUMENTO,
  TIPOS_DOCUMENTO_ADMISION,
  TipoDocumentoAdmision,
} from '../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../core/services/comunicaciones.service';
import { mensajeDeError, mensajesDeError } from '../../core/utils/http-error';

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];

/** Consulta pública del estado de una solicitud de cupo y carga de documentos. */
@Component({
  selector: 'app-consulta-admision',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  template: `
    <form class="buscar" (ngSubmit)="consultar()">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Número de radicado</mat-label>
        <input matInput name="radicado" maxlength="30" required autocomplete="off" [(ngModel)]="radicado" placeholder="ADM-2027-..." />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Documento del aspirante</mat-label>
        <input matInput name="documento" maxlength="20" required inputmode="numeric" autocomplete="off" [(ngModel)]="documento" />
      </mat-form-field>
      <button mat-flat-button class="boton-azul" type="submit" [disabled]="consultando()">Consultar</button>
    </form>
    @if (consultando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Consultando" />
    }
    @if (error(); as e) {
      <p class="aviso-error" role="alert">{{ e }}</p>
    }

    @if (estado(); as s) {
      <section class="resultado" aria-live="polite">
        <header>
          <div>
            <p class="detalle">{{ s.radicado }}</p>
            <h3>{{ s.nombreAspirante }}</h3>
            <p class="detalle">{{ nombreGrado(s.gradoSolicitado) }} · año lectivo {{ s.anioLectivo }} · radicada el {{ s.radicadaEn | date: "d 'de' MMMM" }}</p>
          </div>
          <span class="estado" [attr.data-estado]="s.estado">{{ estados[s.estado] }}</span>
        </header>

        <ol class="linea" aria-label="Avance de la solicitud">
          @for (paso of pasos; track paso.estado; let i = $index) {
            <li [class.hecho]="indicePaso(s) >= i" [class.actual]="indicePaso(s) === i">{{ paso.etiqueta }}</li>
          }
        </ol>

        @if (s.mensajeFamilia) {
          <p class="mensaje">
            <mat-icon aria-hidden="true">campaign</mat-icon>
            <span><strong>Mensaje de la institución:</strong> {{ s.mensajeFamilia }}</span>
          </p>
        }

        <h4>Documentos cargados ({{ s.documentos.length }})</h4>
        <ul class="documentos">
          @for (d of s.documentos; track d.id) {
            <li>
              <mat-icon aria-hidden="true">check_circle</mat-icon>
              {{ tipos[d.tipo] }}
              <span class="detalle">{{ d.nombreArchivo }} · {{ d.tamano / 1024 | number: '1.0-0' }} KB</span>
            </li>
          } @empty {
            <li class="detalle">Aún no ha cargado documentos.</li>
          }
        </ul>

        @if (s.admiteDocumentos) {
          <form class="cargar" (ngSubmit)="subir()">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Documento</mat-label>
              <mat-select name="tipo" [(ngModel)]="tipo" required>
                @for (t of listaTipos; track t[0]) {
                  <mat-option [value]="t[0]">{{ t[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <label class="archivo">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" (change)="elegir($event)" />
              <span>{{ archivo()?.name ?? 'Elegir archivo (PDF, JPG o PNG, máx. 3 MB)' }}</span>
            </label>
            <button mat-flat-button class="boton-institucional" type="submit" [disabled]="subiendo() || !archivo()">
              {{ subiendo() ? 'Cargando...' : 'Cargar' }}
            </button>
          </form>
          @for (e of erroresCarga(); track e) {
            <p class="aviso-error">{{ e }}</p>
          }
        } @else {
          <p class="detalle">Esta solicitud ya fue resuelta y no recibe más documentos.</p>
        }
      </section>
    }
  `,
  styles: `
    .buscar,
    .cargar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block-end: 1rem;

      mat-form-field {
        flex: 1 1 14rem;
      }
    }

    .resultado {
      display: grid;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);

      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      h3,
      h4,
      p {
        margin: 0;
      }

      h3 {
        color: var(--jv-azul);
      }
    }

    .detalle {
      color: var(--jv-texto-suave);
      font-size: 0.88rem;
    }

    .estado {
      padding: 0.2rem 0.8rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-weight: 700;

      &[data-estado='Aprobada'],
      &[data-estado='Matriculada'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
        color: #0f7b3f;
      }

      &[data-estado='DocumentosPendientes'] {
        background: #fff6e0;
        border-color: #f0d58c;
      }

      &[data-estado='Rechazada'] {
        background: #fdecec;
        border-color: #f2b8b8;
        color: var(--jv-rojo);
      }
    }

    .linea {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: paso;

      li {
        position: relative;
        padding-block-start: 1.9rem;
        color: var(--jv-texto-suave);
        font-size: 0.82rem;
        text-align: center;
        counter-increment: paso;

        &::before {
          content: counter(paso);
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 50%;
          translate: -50% 0;
          display: grid;
          place-items: center;
          inline-size: 1.5rem;
          block-size: 1.5rem;
          border-radius: 50%;
          background: var(--jv-superficie-suave);
          border: 2px solid var(--jv-borde);
          font-weight: 700;
        }

        &.hecho {
          color: var(--jv-texto);

          &::before {
            background: var(--jv-azul);
            border-color: var(--jv-azul);
            color: #fff;
          }
        }

        &.actual {
          font-weight: 700;
        }
      }
    }

    .mensaje {
      display: flex;
      gap: 0.5rem;
      padding: 0.6rem 0.8rem;
      border-radius: var(--jv-radio);
      background: #fff6e0;
      border: 1px solid #f0d58c;
    }

    .documentos {
      display: grid;
      gap: 0.3rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      mat-icon {
        color: #0f7b3f;
      }
    }

    .archivo {
      display: flex;
      align-items: center;
      flex: 1 1 14rem;
      min-block-size: 3rem;
      padding: 0 0.8rem;
      border: 1px dashed var(--jv-borde);
      border-radius: var(--jv-radio);
      cursor: pointer;

      input {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        opacity: 0;
      }

      &:focus-within {
        outline: 2px solid var(--jv-azul);
      }
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class ConsultaAdmisionComponent {
  readonly #servicio = inject(ComunicacionesService);

  /** Datos para consultar de una vez (al venir de la pre-matrícula). */
  readonly inicial = input<{ radicado: string; documento: string } | null>(null);

  protected readonly estados = ESTADOS_ADMISION;
  protected readonly tipos = TIPOS_DOCUMENTO_ADMISION;
  protected readonly listaTipos = Object.entries(TIPOS_DOCUMENTO_ADMISION) as [TipoDocumentoAdmision, string][];
  protected readonly nombreGrado = nombreGrado;
  protected readonly pasos = [
    { estado: 'Recibida', etiqueta: 'Recibida' },
    { estado: 'EnRevision', etiqueta: 'En revisión' },
    { estado: 'Aprobada', etiqueta: 'Aprobada' },
    { estado: 'Matriculada', etiqueta: 'Matriculada' },
  ] as const;

  protected radicado = '';
  protected documento = '';
  protected tipo: TipoDocumentoAdmision = 'DocumentoIdentidad';
  protected readonly estado = signal<EstadoAdmisionConsulta | null>(null);
  protected readonly consultando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly archivo = signal<File | null>(null);
  protected readonly subiendo = signal(false);
  protected readonly erroresCarga = signal<string[]>([]);

  constructor() {
    effect(() => {
      const inicial = this.inicial();
      untracked(() => {
        if (inicial) {
          this.radicado = inicial.radicado;
          this.documento = inicial.documento;
          void this.consultar();
        }
      });
    });
  }

  protected indicePaso(s: EstadoAdmisionConsulta): number {
    switch (s.estado) {
      case 'Recibida':
        return 0;
      case 'EnRevision':
      case 'DocumentosPendientes':
      case 'Rechazada':
        return 1;
      case 'Aprobada':
        return 2;
      case 'Matriculada':
        return 3;
    }
  }

  protected async consultar(): Promise<void> {
    const radicado = this.radicado.trim().toUpperCase();
    const documento = this.documento.trim();
    if (!radicado || !documento) {
      this.error.set('Escriba el radicado y el documento del aspirante.');
      return;
    }
    this.consultando.set(true);
    this.error.set(null);
    try {
      this.estado.set(await this.#servicio.consultarAdmision(radicado, documento));
      this.radicado = radicado;
    } catch (error) {
      this.estado.set(null);
      this.error.set(mensajeDeError(error));
    } finally {
      this.consultando.set(false);
    }
  }

  protected elegir(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.erroresCarga.set([]);
    if (archivo && archivo.size > TAMANO_MAXIMO_DOCUMENTO) {
      this.erroresCarga.set(['El archivo pesa más de 3 MB. Tome la foto con menor resolución o comprima el PDF.']);
      this.archivo.set(null);
      return;
    }
    if (archivo && !TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.erroresCarga.set(['Solo se aceptan archivos PDF, JPG o PNG.']);
      this.archivo.set(null);
      return;
    }
    this.archivo.set(archivo);
  }

  protected async subir(): Promise<void> {
    const archivo = this.archivo();
    if (!archivo) {
      return;
    }
    this.subiendo.set(true);
    this.erroresCarga.set([]);
    try {
      await this.#servicio.subirDocumento(this.radicado, this.documento.trim(), this.tipo, archivo);
      this.archivo.set(null);
      this.estado.set(await this.#servicio.consultarAdmision(this.radicado, this.documento.trim()));
    } catch (error) {
      this.erroresCarga.set(mensajesDeError(error));
    } finally {
      this.subiendo.set(false);
    }
  }
}

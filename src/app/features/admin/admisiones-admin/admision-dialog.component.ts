import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { enlaceWhatsApp, nombreGrado } from '../../../core/models/campus.model';
import {
  DocumentoAdmision,
  ESTADOS_ADMISION,
  EstadoAdmision,
  SolicitudAdmision,
  TIPOS_DOCUMENTO_ADMISION,
  TIPOS_DOCUMENTO_ASPIRANTE,
} from '../../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../../core/services/comunicaciones.service';
import { SesionService } from '../../../core/services/sesion.service';
import { descargarBlob } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Resultado del diálogo: la solicitud actualizada, o 'eliminada'. */
export type ResultadoAdmisionDialog = SolicitudAdmision | 'eliminada';

/** Detalle de una solicitud de pre-matrícula: datos, documentos, cambio de estado y matrícula. */
@Component({
  selector: 'app-admision-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    @let s = solicitud();
    <h2 mat-dialog-title>
      {{ s.aspiranteNombres }} {{ s.aspiranteApellidos }}
      <span class="radicado">{{ s.radicado }}</span>
    </h2>
    <mat-dialog-content>
      <p class="estado-actual">
        <span class="estado" [attr.data-estado]="s.estado">{{ estados[s.estado] }}</span>
        Radicada el {{ s.creadoEn | date: "d 'de' MMMM 'de' y, h:mm a" }}
        @if (s.estadoCambiadoEn) {
          · último cambio {{ s.estadoCambiadoEn | date: 'd MMM, h:mm a' }}
        }
      </p>

      <div class="columnas">
        <section>
          <h3>Aspirante</h3>
          <dl>
            <dt>Documento</dt><dd>{{ tiposDocumento[s.aspiranteTipoDocumento] }} {{ s.aspiranteDocumento }}</dd>
            <dt>Nacimiento</dt><dd>{{ s.aspiranteFechaNacimiento | date: "d 'de' MMMM 'de' y" }} ({{ edad() }} años)</dd>
            <dt>Grado solicitado</dt><dd>{{ nombreGrado(s.gradoSolicitado) }} · año {{ s.anioLectivo }}</dd>
            @if (s.colegioProcedencia) {
              <dt>Viene de</dt><dd>{{ s.colegioProcedencia }}</dd>
            }
            @if (s.eps) {
              <dt>EPS / SISBÉN</dt><dd>{{ s.eps }}</dd>
            }
            @if (s.direccion) {
              <dt>Dirección</dt><dd>{{ s.direccion }}</dd>
            }
          </dl>
        </section>
        <section>
          <h3>Acudiente</h3>
          <dl>
            <dt>Nombre</dt><dd>{{ s.acudienteNombre }}@if (s.acudienteParentesco) { ({{ s.acudienteParentesco }})}</dd>
            <dt>Documento</dt><dd>{{ s.acudienteDocumento }}</dd>
            <dt>Teléfono</dt>
            <dd>
              {{ s.acudienteTelefono }}
              @if (whatsapp(); as w) {
                <a [href]="w" target="_blank" rel="noopener" class="whatsapp">WhatsApp</a>
              }
            </dd>
            @if (s.acudienteCorreo) {
              <dt>Correo</dt><dd><a [href]="'mailto:' + s.acudienteCorreo">{{ s.acudienteCorreo }}</a></dd>
            }
          </dl>
        </section>
      </div>

      @if (s.observaciones) {
        <p class="observaciones"><strong>Observaciones de la familia:</strong> {{ s.observaciones }}</p>
      }

      <section>
        <h3>Documentos ({{ s.documentos.length }})</h3>
        @for (d of s.documentos; track d.id) {
          <div class="documento">
            <mat-icon aria-hidden="true">{{ d.tipoContenido === 'application/pdf' ? 'picture_as_pdf' : 'image' }}</mat-icon>
            <span>
              <strong>{{ tiposAdjunto[d.tipo] }}</strong>
              <span class="detalle">{{ d.nombreArchivo }} · {{ d.tamano / 1024 | number: '1.0-0' }} KB · {{ d.creadoEn | date: 'd MMM' }}</span>
            </span>
            <button mat-button type="button" (click)="descargar(d)">Descargar</button>
          </div>
        } @empty {
          <p class="detalle">La familia aún no ha cargado documentos.</p>
        }
      </section>

      @if (s.estado !== 'Matriculada' && puedeEditar) {
        <section class="gestion">
          <h3>Actualizar estado</h3>
          <div class="fila">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Estado</mat-label>
              <mat-select [(ngModel)]="estado">
                @for (e of estadosEditables; track e[0]) {
                  <mat-option [value]="e[0]">{{ e[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Mensaje para la familia (lo ven al consultar el radicado)</mat-label>
            <textarea matInput rows="2" maxlength="1000" [(ngModel)]="mensajeFamilia" [placeholder]="sugerencia()"></textarea>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Nota interna (solo la ve secretaría)</mat-label>
            <textarea matInput rows="2" maxlength="1000" [(ngModel)]="notaInterna"></textarea>
          </mat-form-field>
          <div class="acciones">
            <button mat-flat-button class="boton-azul" type="button" [disabled]="trabajando()" (click)="guardarEstado()">Guardar estado</button>
          </div>
        </section>

        @if (s.estado !== 'Rechazada') {
          <section class="gestion">
            <h3>Matricular</h3>
            <p class="detalle">
              Crea al estudiante en el campus (grado {{ nombreGrado(s.gradoSolicitado) }}) y a su acudiente, los vincula y
              marca la solicitud como matriculada. Si ya existen con ese documento, se reutilizan.
            </p>
            <div class="fila">
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Grupo (opcional)</mat-label>
                <input matInput maxlength="10" [(ngModel)]="grupo" placeholder="A" />
              </mat-form-field>
              <button mat-flat-button class="boton-institucional" type="button" [disabled]="trabajando()" (click)="matricular()">
                <mat-icon aria-hidden="true">how_to_reg</mat-icon>
                Matricular
              </button>
            </div>
          </section>
        }
      }
      @if (s.estado === 'Matriculada') {
        <p class="matriculada">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          Matriculado. Genere las claves del estudiante y del acudiente en «Comunidad del campus».
        </p>
      }
      @if (s.notaInterna && s.estado === 'Matriculada') {
        <p class="detalle">Nota interna: {{ s.notaInterna }}</p>
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      @if (puedeEliminar) {
        <button mat-button type="button" class="eliminar" [disabled]="trabajando()" (click)="eliminar()">Eliminar</button>
      }
      <span class="espacio"></span>
      <button mat-button type="button" (click)="cerrar()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .radicado {
      display: block;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;
      font-weight: 500;
      font-family: ui-monospace, Consolas, monospace;
    }

    mat-dialog-content {
      display: grid;
      gap: 0.9rem;
    }

    h3 {
      margin: 0 0 0.4rem;
      color: var(--jv-azul);
      font-size: 1rem;
    }

    .estado-actual {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0;
      color: var(--jv-texto-suave);
    }

    .estado {
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      color: var(--jv-texto);
      font-size: 0.8rem;
      font-weight: 600;

      &[data-estado='Aprobada'],
      &[data-estado='Matriculada'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
      }

      &[data-estado='DocumentosPendientes'] {
        background: #fff6e0;
        border-color: #f0d58c;
      }

      &[data-estado='Rechazada'] {
        background: #fdecec;
        border-color: #f2b8b8;
      }
    }

    .columnas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2rem 0.75rem;
      margin: 0;
    }

    dt {
      color: var(--jv-texto-suave);
    }

    dd {
      margin: 0;
    }

    .whatsapp {
      margin-inline-start: 0.4rem;
      color: #128c4a;
      font-weight: 600;
    }

    .observaciones {
      margin: 0;
      padding: 0.6rem 0.8rem;
      background: var(--jv-superficie-suave);
      border-radius: var(--jv-radio);
    }

    .documento {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.6rem;
      padding-block: 0.3rem;
      border-block-end: 1px solid var(--jv-borde);
    }

    .detalle {
      display: block;
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .gestion {
      display: grid;
      gap: 0.5rem;
      padding: 0.8rem;
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);
    }

    .fila {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .acciones {
      display: flex;
      justify-content: flex-end;
    }

    .matriculada {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0;
      color: #0f7b3f;
      font-weight: 600;
    }

    .eliminar {
      color: var(--jv-rojo);
    }

    .espacio {
      flex: 1;
    }

    .aviso-error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class AdmisionDialogComponent {
  readonly #servicio = inject(ComunicacionesService);
  readonly #ref = inject(MatDialogRef<AdmisionDialogComponent, ResultadoAdmisionDialog>);
  readonly #snackBar = inject(MatSnackBar);
  readonly #sesion = inject(SesionService);

  protected readonly solicitud = signal(inject<SolicitudAdmision>(MAT_DIALOG_DATA));
  protected readonly estados = ESTADOS_ADMISION;
  protected readonly estadosEditables = (Object.entries(ESTADOS_ADMISION) as [EstadoAdmision, string][]).filter(
    ([e]) => e !== 'Matriculada',
  );
  protected readonly tiposDocumento = TIPOS_DOCUMENTO_ASPIRANTE;
  protected readonly tiposAdjunto = TIPOS_DOCUMENTO_ADMISION;
  protected readonly nombreGrado = nombreGrado;
  protected readonly puedeEditar = this.#sesion.puede('Admisiones', 'Editar');
  protected readonly puedeEliminar = this.#sesion.puede('Admisiones', 'Eliminar');
  protected readonly trabajando = signal(false);
  protected readonly error = signal<string | null>(null);
  #cambio = false;

  protected estado: EstadoAdmision = this.solicitud().estado === 'Recibida' ? 'EnRevision' : this.solicitud().estado;
  protected mensajeFamilia = this.solicitud().mensajeFamilia ?? '';
  protected notaInterna = this.solicitud().notaInterna ?? '';
  protected grupo = '';

  protected readonly edad = computed(() => {
    const nacimiento = new Date(this.solicitud().aspiranteFechaNacimiento);
    const hoy = new Date();
    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    if (hoy < new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())) {
      anios--;
    }
    return anios;
  });

  protected readonly whatsapp = computed(() => {
    const s = this.solicitud();
    return enlaceWhatsApp(
      s.acudienteTelefono,
      `Buen día, le escribimos de la I.E. José De La Vega sobre la solicitud de cupo ${s.radicado} de ${s.aspiranteNombres}.`,
    );
  });

  protected readonly sugerencia = computed(() =>
    this.solicitud().documentos.length === 0 ? 'Ej.: Por favor cargue el registro civil y el certificado de notas.' : '',
  );

  protected async descargar(d: DocumentoAdmision): Promise<void> {
    try {
      descargarBlob(await this.#servicio.descargarDocumento(this.solicitud().id, d.id), d.nombreArchivo);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async guardarEstado(): Promise<void> {
    await this.#trabajar(async () => {
      const actualizada = await this.#servicio.cambiarEstadoAdmision(this.solicitud().id, {
        estado: this.estado,
        mensajeFamilia: this.mensajeFamilia.trim() || null,
        notaInterna: this.notaInterna.trim() || null,
      });
      this.solicitud.set(actualizada);
      this.#snackBar.open('Estado actualizado. La familia lo verá al consultar su radicado.', 'Cerrar', { duration: 4000 });
    });
  }

  protected async matricular(): Promise<void> {
    if (!confirm('¿Matricular al aspirante y crear sus usuarios del campus?')) {
      return;
    }
    await this.#trabajar(async () => {
      const m = await this.#servicio.matricular(this.solicitud().id, this.grupo.trim() || null);
      this.solicitud.set(await this.#servicio.admision(this.solicitud().id));
      const partes = [
        m.estudianteNuevo ? 'estudiante creado' : 'estudiante existente actualizado',
        m.acudienteNuevo ? 'acudiente creado' : 'acudiente existente vinculado',
      ];
      this.#snackBar.open(`Matriculado: ${partes.join(', ')}.`, 'Cerrar', { duration: 5000 });
    });
  }

  protected async eliminar(): Promise<void> {
    if (!confirm('¿Eliminar esta solicitud y sus documentos? No se puede deshacer.')) {
      return;
    }
    this.trabajando.set(true);
    try {
      await this.#servicio.eliminarAdmision(this.solicitud().id);
      this.#ref.close('eliminada');
    } catch (error) {
      this.error.set(mensajeDeError(error));
      this.trabajando.set(false);
    }
  }

  protected cerrar(): void {
    this.#ref.close(this.#cambio ? this.solicitud() : undefined);
  }

  async #trabajar(accion: () => Promise<void>): Promise<void> {
    this.trabajando.set(true);
    this.error.set(null);
    try {
      await accion();
      this.#cambio = true;
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.trabajando.set(false);
    }
  }
}

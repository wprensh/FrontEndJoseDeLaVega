import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { PagedResult, paginaVacia } from '../../../core/models/api.models';
import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_ADMISION, EstadoAdmision, SolicitudAdmision } from '../../../core/models/comunicaciones.model';
import { hoyColombia } from '../../../core/models/academico.model';
import { ComunicacionesService, FiltroAdmisiones } from '../../../core/services/comunicaciones.service';
import { descargarCsv } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { AdmisionDialogComponent, ResultadoAdmisionDialog } from './admision-dialog.component';

/** Bandeja de solicitudes de pre-matrícula en línea. */
@Component({
  selector: 'app-admisiones-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Admisiones"
        subtitulo="Solicitudes de cupo radicadas en línea por las familias"
        etiqueta="Panel administrativo"
      />

      <section class="tarjeta">
        <form class="filtros" (ngSubmit)="buscar()">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Buscar</mat-label>
            <input matInput name="buscar" [(ngModel)]="filtro.buscar" placeholder="Radicado, nombre o documento" />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Estado</mat-label>
            <mat-select name="estado" [(ngModel)]="filtro.estado" (selectionChange)="buscar()">
              <mat-option [value]="null">Todos</mat-option>
              @for (e of estados; track e[0]) {
                <mat-option [value]="e[0]">{{ e[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Grado</mat-label>
            <mat-select name="grado" [(ngModel)]="filtro.grado" (selectionChange)="buscar()">
              <mat-option [value]="null">Todos</mat-option>
              @for (g of grados; track g) {
                <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Año lectivo</mat-label>
            <mat-select name="anio" [(ngModel)]="filtro.anioLectivo" (selectionChange)="buscar()">
              <mat-option [value]="null">Todos</mat-option>
              @for (a of anios; track a) {
                <mat-option [value]="a">{{ a }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="submit">Buscar</button>
          <span class="espacio"></span>
          <button mat-button type="button" (click)="exportar()" [disabled]="!pagina().items.length">
            <mat-icon aria-hidden="true">download</mat-icon>
            Exportar CSV
          </button>
        </form>

        <p class="ayuda">
          Las familias radican la solicitud en <a href="admisiones" target="_blank">la página de Admisiones</a>, reciben un número
          de radicado y con él consultan el estado y cargan documentos. Abra una solicitud para revisarla, pedir documentos,
          aprobarla o matricular.
        </p>

        @if (cargando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
        }
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
        }

        <div class="desplazable">
          <table class="tabla">
            <thead>
              <tr>
                <th scope="col">Radicado</th>
                <th scope="col">Aspirante</th>
                <th scope="col">Grado</th>
                <th scope="col">Acudiente</th>
                <th scope="col">Docs.</th>
                <th scope="col">Radicada</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (s of pagina().items; track s.id) {
                <tr (click)="abrir(s)" class="fila-click">
                  <td class="radicado">
                    <button type="button" class="enlace" (click)="$event.stopPropagation(); abrir(s)">{{ s.radicado }}</button>
                  </td>
                  <th scope="row">{{ s.aspiranteNombres }} {{ s.aspiranteApellidos }}<span class="detalle">{{ s.aspiranteDocumento }}</span></th>
                  <td>{{ nombreGrado(s.gradoSolicitado) }}<span class="detalle">{{ s.anioLectivo }}</span></td>
                  <td>{{ s.acudienteNombre }}<span class="detalle">{{ s.acudienteTelefono }}</span></td>
                  <td>{{ s.documentos.length }}</td>
                  <td>{{ s.creadoEn | date: 'd MMM y' }}</td>
                  <td><span class="estado" [attr.data-estado]="s.estado">{{ nombresEstado[s.estado] }}</span></td>
                </tr>
              } @empty {
                @if (!cargando()) {
                  <tr><td colspan="7" class="vacio">No hay solicitudes con estos filtros.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        <mat-paginator
          [length]="pagina().total"
          [pageIndex]="(filtro.pagina ?? 1) - 1"
          [pageSize]="filtro.tamanoPagina"
          [pageSizeOptions]="[20, 50, 100]"
          (page)="cambiarPagina($event)"
          aria-label="Páginas de solicitudes"
        />
      </section>
    </div>
  `,
  styles: `
    .filtros {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;

      .espacio {
        flex: 1;
      }
    }

    .ayuda {
      color: var(--jv-texto-suave);
    }

    .desplazable {
      overflow-x: auto;
    }

    .tabla {
      inline-size: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 0.55rem 0.6rem;
        border-block-end: 1px solid var(--jv-borde);
        text-align: start;
      }

      thead th {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .fila-click {
        cursor: pointer;

        &:hover {
          background: var(--jv-superficie-suave);
        }
      }

      .radicado {
        font-family: ui-monospace, Consolas, monospace;
        white-space: nowrap;
      }

      .enlace {
        padding: 0;
        border: none;
        background: none;
        color: var(--jv-azul);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .detalle {
        display: block;
        color: var(--jv-texto-suave);
        font-size: 0.82rem;
        font-weight: 400;
      }

      .vacio {
        padding: 2rem;
        color: var(--jv-texto-suave);
        text-align: center;
      }
    }

    .estado {
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;

      &[data-estado='Recibida'] {
        background: #e8effa;
        border-color: #b8c9e8;
      }

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

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class AdmisionesAdminComponent implements OnInit {
  readonly #servicio = inject(ComunicacionesService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly estados = Object.entries(ESTADOS_ADMISION) as [EstadoAdmision, string][];
  protected readonly nombresEstado = ESTADOS_ADMISION;
  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly anios = ((a) => [a + 1, a, a - 1])(Number(hoyColombia().slice(0, 4)));

  protected readonly pagina = signal<PagedResult<SolicitudAdmision>>(paginaVacia());
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly filtro: FiltroAdmisiones = {
    buscar: '',
    estado: null,
    grado: null,
    anioLectivo: null,
    pagina: 1,
    tamanoPagina: 20,
  };

  ngOnInit(): void {
    void this.recargar();
  }

  protected buscar(): void {
    this.filtro.pagina = 1;
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.filtro.pagina = evento.pageIndex + 1;
    this.filtro.tamanoPagina = evento.pageSize;
    void this.recargar();
  }

  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.pagina.set(await this.#servicio.admisiones({ ...this.filtro, buscar: this.filtro.buscar?.trim() || null }));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async abrir(s: SolicitudAdmision): Promise<void> {
    let detalle: SolicitudAdmision;
    try {
      detalle = await this.#servicio.admision(s.id);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
      return;
    }
    const resultado = await firstValueFrom(
      this.#dialog
        .open<AdmisionDialogComponent, SolicitudAdmision, ResultadoAdmisionDialog>(AdmisionDialogComponent, {
          data: detalle,
          width: '760px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (resultado === 'eliminada') {
      this.#snackBar.open('Solicitud eliminada.', 'Cerrar', { duration: 3000 });
    }
    // Recarga siempre: el diálogo pudo cambiar el estado o matricular aunque se cierre con Esc.
    await this.recargar();
  }

  protected exportar(): void {
    descargarCsv(
      `admisiones-${hoyColombia()}.csv`,
      [
        'Radicado', 'Estado', 'Año', 'Grado', 'Aspirante', 'Documento', 'Nacimiento', 'Colegio de procedencia',
        'Acudiente', 'Documento acudiente', 'Teléfono', 'Correo', 'Documentos cargados', 'Radicada',
      ],
      this.pagina().items.map((s) => [
        s.radicado,
        ESTADOS_ADMISION[s.estado],
        s.anioLectivo,
        nombreGrado(s.gradoSolicitado),
        `${s.aspiranteNombres} ${s.aspiranteApellidos}`,
        s.aspiranteDocumento,
        s.aspiranteFechaNacimiento,
        s.colegioProcedencia,
        s.acudienteNombre,
        s.acudienteDocumento,
        s.acudienteTelefono,
        s.acudienteCorreo,
        s.documentos.length,
        s.creadoEn.slice(0, 10),
      ]),
    );
  }
}

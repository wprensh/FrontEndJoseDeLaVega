import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { Curso, ReporteAsistencia, hoyColombia } from '../../core/models/academico.model';
import { nombreGrado } from '../../core/models/campus.model';
import { AcademicoAdminService } from '../../core/services/academico-admin.service';
import { descargarCsv } from '../../core/utils/csv';
import { mensajeDeError } from '../../core/utils/http-error';

/** Inasistencias por estudiante de un curso en un rango de fechas, con descarga a Excel (CSV). */
@Component({
  selector: 'app-reporte-asistencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule, MatSelectModule],
  template: `
    <form class="filtros" (ngSubmit)="ver()">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Curso</mat-label>
        <mat-select name="curso" [(ngModel)]="curso">
          @for (c of cursos(); track clave(c)) {
            <mat-option [value]="clave(c)">{{ nombre(c) }} ({{ c.estudiantes }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Desde</mat-label>
        <input matInput type="date" name="desde" [(ngModel)]="desde" />
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Hasta</mat-label>
        <input matInput type="date" name="hasta" [(ngModel)]="hasta" />
      </mat-form-field>
      <button mat-flat-button class="boton-azul" type="submit" [disabled]="cargando()">Ver reporte</button>
    </form>
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando reporte" />
    }
    @if (error(); as e) {
      <p class="aviso-error" role="alert">{{ e }}</p>
    }
    @if (reporte(); as r) {
      <div class="barra">
        <p class="ayuda">
          {{ nombre(r) }}: {{ r.clasesRegistradas }} clases con lista tomada entre {{ r.desde | date: 'd MMM' }} y
          {{ r.hasta | date: 'd MMM y' }}. En rojo, 10 fallas o más.
        </p>
        <button mat-stroked-button type="button" (click)="descargar(r)">
          <mat-icon aria-hidden="true">download</mat-icon>
          Descargar Excel (CSV)
        </button>
      </div>
      <div class="desplazable">
        <table class="tabla">
          <thead>
            <tr><th scope="col">Estudiante</th><th scope="col">Fallas</th><th scope="col">Llegadas tarde</th><th scope="col">Con excusa</th></tr>
          </thead>
          <tbody>
            @for (f of r.filas; track f.estudianteId) {
              <tr [class.alerta]="f.ausencias >= 10">
                <th scope="row">{{ f.nombreCompleto }}</th>
                <td>{{ f.ausencias }}</td>
                <td>{{ f.tardes }}</td>
                <td>{{ f.excusas }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="vacio">El curso no tiene estudiantes.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .filtros,
    .barra {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block-end: 0.75rem;
    }

    .ayuda {
      flex: 1 1 18rem;
      margin: 0;
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
        padding: 0.5rem 0.6rem;
        border-block-end: 1px solid var(--jv-borde);
        text-align: start;
      }

      thead th {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
      }

      .alerta {
        color: var(--jv-rojo);
        font-weight: 700;
      }

      .vacio {
        padding: 1.5rem;
        color: var(--jv-texto-suave);
        text-align: center;
      }
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ReporteAsistenciaComponent implements OnInit {
  readonly #servicio = inject(AcademicoAdminService);

  protected readonly cursos = signal<Curso[]>([]);
  protected readonly reporte = signal<ReporteAsistencia | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected curso = '';
  protected desde = `${hoyColombia().slice(0, 4)}-01-01`;
  protected hasta = hoyColombia();

  ngOnInit(): void {
    this.#servicio
      .cursos()
      .then((c) => this.cursos.set(c))
      .catch((e: unknown) => this.error.set(mensajeDeError(e)));
  }

  protected clave(c: { grado: number; grupo: string | null }): string {
    return `${c.grado}|${c.grupo ?? ''}`;
  }

  protected nombre(c: { grado: number; grupo: string | null }): string {
    return [nombreGrado(c.grado), c.grupo].filter(Boolean).join(' ');
  }

  protected async ver(): Promise<void> {
    if (!this.curso) {
      this.error.set('Elija el curso.');
      return;
    }
    const [grado, grupo] = this.curso.split('|');
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.reporte.set(await this.#servicio.reporteAsistencia(Number(grado), grupo || null, this.desde || undefined, this.hasta || undefined));
    } catch (e) {
      this.error.set(mensajeDeError(e));
    } finally {
      this.cargando.set(false);
    }
  }

  protected descargar(r: ReporteAsistencia): void {
    descargarCsv(
      `asistencia-${this.nombre(r).replace(/\s+/g, '')}.csv`,
      ['Estudiante', 'Documento', 'Fallas', 'Llegadas tarde', 'Con excusa'],
      r.filas.map((f) => [f.nombreCompleto, f.documento, f.ausencias, f.tardes, f.excusas]),
    );
  }
}

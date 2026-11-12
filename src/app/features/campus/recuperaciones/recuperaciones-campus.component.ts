import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { formatoNota } from '../../../core/models/academico.model';
import { ESTADOS_RECUPERACION, Recuperacion } from '../../../core/models/mejoras.model';
import { CampusService } from '../../../core/services/campus.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent } from '../compartido/selector-estudiante.component';

/** Planes de mejoramiento del estudiante: qué hacer, hasta cuándo y el resultado de la recuperación. */
@Component({
  selector: 'app-recuperaciones-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, MatProgressBarModule, EncabezadoCampusComponent, SelectorEstudianteComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Recuperaciones" subtitulo="Planes de mejoramiento de las asignaturas con nota por debajo de 3,0" icono="restart_alt" />
      @if (!esEstudiante()) {
        <app-selector-estudiante [(estudianteId)]="estudianteId" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      @if (lista(); as l) {
        <ul class="lista">
          @for (r of l; track r.id) {
            <li class="tarjeta" [attr.data-estado]="r.estado">
              <div class="cabecera">
                <h2>{{ r.asignatura }} · {{ r.periodo }}</h2>
                <span class="etiqueta-estado" [attr.data-tono]="r.estado === 'Aprobada' ? 'ok' : r.estado === 'Reprobada' ? 'peligro' : 'alerta'">
                  {{ estados[r.estado] }}
                </span>
              </div>
              <p class="texto-suave">Nota del periodo {{ nota(r.notaOriginal) }} · asignado por {{ r.registradaPor }}</p>
              <p class="pre-linea">{{ r.plan }}</p>
              @if (r.fechaLimite) {
                <p><mat-icon aria-hidden="true" inline>event</mat-icon> <strong>Fecha límite: {{ r.fechaLimite | date: "EEEE d 'de' MMMM" }}</strong></p>
              }
              @if (r.notaRecuperacion !== null) {
                <p>Nota de la recuperación: <strong>{{ nota(r.notaRecuperacion) }}</strong> · nota definitiva del periodo: <strong>{{ nota(r.notaDefinitiva) }}</strong></p>
              }
              @if (r.observacion) {
                <p class="texto-suave">{{ r.observacion }}</p>
              }
            </li>
          } @empty {
            <li class="tarjeta vacio"><mat-icon aria-hidden="true" inline>verified</mat-icon> No hay recuperaciones pendientes ni registradas.</li>
          }
        </ul>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando recuperaciones" />
      }
    </div>
  `,
  styles: `
    .lista {
      display: grid;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li[data-estado='Pendiente'] {
      border-inline-start: 4px solid var(--jv-amarillo);
    }

    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;

      h2 {
        margin: 0;
        color: var(--jv-azul);
        font-size: 1.05rem;
      }
    }

    .vacio {
      color: var(--jv-texto-suave);
    }
  `,
})
export class RecuperacionesCampusComponent {
  readonly #servicio = inject(CampusMejorasService);
  protected readonly esEstudiante = inject(CampusService).esEstudiante;
  protected readonly estudianteId = signal<string | null>(null);
  protected readonly lista = signal<Recuperacion[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly estados = ESTADOS_RECUPERACION;
  protected readonly nota = formatoNota;

  constructor() {
    effect(() => {
      const id = this.estudianteId();
      if (this.esEstudiante() || id) {
        this.error.set(null);
        this.#servicio
          .misRecuperaciones(this.esEstudiante() ? null : id)
          .then((l) => this.lista.set(l))
          .catch((e: unknown) => this.error.set(mensajeDeError(e)));
      }
    });
  }
}

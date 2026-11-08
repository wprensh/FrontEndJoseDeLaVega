import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { CursoDocente, MisCursos } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Carga académica del docente: cada clase lleva a su planilla de notas, asistencia y observador. */
@Component({
  selector: 'app-mis-clases',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatProgressBarModule, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        titulo="Mis clases"
        [subtitulo]="datos() ? 'Año lectivo ' + datos()!.anio + periodoAbierto() : ''"
        icono="co_present"
      />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (datos(); as d) {
        @if (d.cursos.length) {
          <ul class="clases">
            @for (c of d.cursos; track c.asignacionId) {
              <li>
                <a class="tarjeta-franja franja-azul clase" [routerLink]="['/campus/docente', c.asignacionId]">
                  <span class="curso">{{ curso(c) }}</span>
                  <strong>{{ c.asignatura }}</strong>
                  <span class="detalle">{{ c.area }}</span>
                  <span class="detalle">
                    <mat-icon aria-hidden="true">groups</mat-icon> {{ c.estudiantes }} estudiantes
                    @if (c.intensidadHoraria) {
                      · {{ c.intensidadHoraria }} h/semana
                    }
                  </span>
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="tarjeta vacio">
            Todavía no tiene clases asignadas este año. La coordinación académica las registra en el panel (Académico → Carga docente).
          </p>
        }
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando clases" />
      }
    </div>
  `,
  styles: `
    .clases {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .clase {
      display: grid;
      gap: 0.2rem;
      block-size: 100%;
      color: inherit;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover,
      &:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgb(10 38 71 / 14%);
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.1rem;
      }
    }

    .curso {
      justify-self: start;
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-amarillo);
      color: var(--jv-azul);
      font-weight: 800;
    }

    .detalle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;

      mat-icon {
        font-size: 18px;
        inline-size: 18px;
        block-size: 18px;
      }
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class MisClasesComponent {
  readonly #servicio = inject(CampusAcademicoService);

  protected readonly datos = signal<MisCursos | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly periodoAbierto = computed(() => {
    const abierto = this.datos()?.periodos.find((p) => p.notasAbiertas);
    return abierto ? ` · Notas abiertas: ${abierto.nombre}` : ' · No hay periodos abiertos para notas';
  });

  constructor() {
    this.#servicio
      .misCursos()
      .then((d) => this.datos.set(d))
      .catch((error: unknown) => this.error.set(mensajeDeError(error)));
  }

  protected curso(c: CursoDocente): string {
    return [nombreGrado(c.grado), c.grupo ?? '(todos)'].join(' ');
  }
}

import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_SIMULACRO, SimulacroCampus, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusService } from '../../../core/services/campus.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Simulacros del campus: el estudiante los presenta, el acudiente ve resultados y el docente los de sus cursos. */
@Component({
  selector: 'app-simulacros-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        titulo="Simulacros Saber"
        subtitulo="Pruebas de práctica tipo ICFES: Saber 11, 9°, 5° y 3°"
        icono="quiz"
      />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (simulacros(); as lista) {
        <ul class="lista">
          @for (s of lista; track s.id + (s.estudianteId ?? '')) {
            <li class="tarjeta-franja franja-amarilla simulacro">
              <div class="cabecera">
                <span class="tipo">{{ tipos[s.tipo] }}</span>
                <span class="estado" [attr.data-estado]="s.estado">{{ estados[s.estado] }}</span>
              </div>
              <h2>{{ s.titulo }}</h2>
              @if (rol() === 'Acudiente' && s.estudianteNombre) {
                <p class="estudiante"><mat-icon aria-hidden="true">person</mat-icon> {{ s.estudianteNombre }}</p>
              }
              <p class="detalle">
                {{ s.totalPreguntas }} preguntas · {{ s.duracionMinutos }} minutos · {{ grados(s.grados) }}
              </p>
              <p class="detalle">
                Disponible del {{ s.inicio | date: "d MMM, h:mm a" }} al {{ s.fin | date: "d MMM, h:mm a" }}
              </p>

              <div class="acciones">
                @switch (rol()) {
                  @case ('Docente') {
                    <span class="dato">{{ s.presentados ?? 0 }} entregados</span>
                    <a mat-stroked-button [routerLink]="['/campus/simulacros', s.id, 'resultados']">
                      <mat-icon aria-hidden="true">insights</mat-icon>
                      Resultados de mis cursos
                    </a>
                  }
                  @default {
                    @if (s.intento === 'Entregado') {
                      <span class="puntaje">
                        {{ s.porcentaje | number: '1.0-0' }} %
                        @if (s.global !== null) {
                          · {{ s.global }} / 500
                        }
                      </span>
                      <a
                        mat-stroked-button
                        [routerLink]="['/campus/simulacros', s.id, 'resultado']"
                        [queryParams]="rol() === 'Acudiente' ? { estudiante: s.estudianteId } : {}"
                      >
                        Ver resultado
                      </a>
                    } @else if (rol() === 'Estudiante' && s.estado === 'Abierto') {
                      <a mat-flat-button class="boton-institucional" [routerLink]="['/campus/simulacros', s.id, 'presentar']">
                        <mat-icon aria-hidden="true">{{ s.intento === 'EnCurso' ? 'play_arrow' : 'edit_note' }}</mat-icon>
                        {{ s.intento === 'EnCurso' ? 'Continuar' : 'Presentar' }}
                      </a>
                    } @else if (s.estado === 'Programado') {
                      <span class="dato">Aún no abre</span>
                    } @else {
                      <span class="dato">{{ s.estado === 'Cerrado' ? 'No presentado' : 'Sin presentar' }}</span>
                    }
                  }
                }
              </div>
            </li>
          } @empty {
            <li class="tarjeta vacio">No hay simulacros programados por ahora.</li>
          }
        </ul>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando simulacros" />
      }
    </div>
  `,
  styles: `
    .lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .simulacro {
      display: grid;
      gap: 0.35rem;
      align-content: start;

      h2 {
        margin: 0;
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.1rem;
      }
    }

    .cabecera {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .tipo {
      color: var(--jv-azul-medio);
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
    }

    .estado {
      padding: 0.05rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.78rem;
      font-weight: 600;

      &[data-estado='Abierto'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
        color: #0f5d31;
      }
    }

    .estudiante {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      font-weight: 600;
    }

    .detalle {
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;
    }

    .acciones {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-block-start: 0.5rem;
    }

    .puntaje {
      color: var(--jv-azul);
      font-family: var(--jv-fuente-titulos);
      font-weight: 800;
      font-size: 1.2rem;
    }

    .dato {
      color: var(--jv-texto-suave);
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class SimulacrosCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);
  readonly #campus = inject(CampusService);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly estados = ESTADOS_SIMULACRO;
  protected readonly rol = computed(() => this.#campus.perfil()?.rol ?? 'Estudiante');
  protected readonly simulacros = signal<SimulacroCampus[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.#servicio
      .simulacros()
      .then((lista) => this.simulacros.set(lista))
      .catch((error: unknown) => this.error.set(mensajeDeError(error)));
  }

  protected grados(grados: readonly number[]): string {
    return grados.length ? `Grados ${grados.map(nombreGrado).join(', ')}` : '';
  }
}

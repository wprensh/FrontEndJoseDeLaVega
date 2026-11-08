import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ESTADOS_ASISTENCIA, ResumenAsistencia } from '../../../core/models/academico.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent } from '../compartido/selector-estudiante.component';

/** Fallas, llegadas tarde y excusas del año lectivo, clase por clase. */
@Component({
  selector: 'app-asistencia-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, MatProgressBarModule, EncabezadoCampusComponent, SelectorEstudianteComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Asistencia" subtitulo="Novedades registradas por los docentes en cada clase" icono="event_available" />
      <app-selector-estudiante [(estudianteId)]="estudianteId" />

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando asistencia" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (resumen(); as r) {
        <ul class="totales">
          <li class="tarjeta"><strong>{{ r.ausencias }}</strong><span>Fallas</span></li>
          <li class="tarjeta"><strong>{{ r.tardes }}</strong><span>Llegadas tarde</span></li>
          <li class="tarjeta"><strong>{{ r.excusas }}</strong><span>Con excusa</span></li>
        </ul>

        <section class="tarjeta" aria-labelledby="titulo-novedades">
          <h2 id="titulo-novedades">Detalle {{ r.anio }}</h2>
          @if (r.novedades.length) {
            <table>
              <thead>
                <tr><th scope="col">Fecha</th><th scope="col">Clase</th><th scope="col">Novedad</th><th scope="col">Observación</th></tr>
              </thead>
              <tbody>
                @for (n of r.novedades; track $index) {
                  <tr>
                    <td>{{ n.fecha | date: 'EEE d MMM' }}</td>
                    <td>{{ n.asignatura }}</td>
                    <td><span class="estado" [attr.data-estado]="n.estado">{{ estados[n.estado] }}</span></td>
                    <td>{{ n.observacion ?? '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="vacio"><mat-icon aria-hidden="true">verified</mat-icon> Sin fallas ni llegadas tarde este año. ¡Excelente!</p>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .totales {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        text-align: center;
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 2rem;
      }

      span {
        color: var(--jv-texto-suave);
      }
    }

    h2 {
      margin-block-start: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    table {
      inline-size: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.5rem;
      border-block-end: 1px solid var(--jv-borde);
      text-align: start;
    }

    .estado {
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 600;
      background: #fde2e5;
      color: #8c1222;

      &[data-estado='Tarde'] {
        background: #fff1cc;
        color: #7a5200;
      }

      &[data-estado='Excusa'] {
        background: #e3edf9;
        color: var(--jv-azul-medio);
      }
    }

    .vacio {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #0f7b3f;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class AsistenciaCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);

  protected readonly estados = ESTADOS_ASISTENCIA;
  protected readonly estudianteId = signal<string | null>(null);
  protected readonly resumen = signal<ResumenAsistencia | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.estudianteId();
      if (id) {
        void this.#cargar(id);
      }
    });
  }

  async #cargar(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resumen.set(await this.#servicio.asistencia(id));
    } catch (error) {
      this.resumen.set(null);
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}

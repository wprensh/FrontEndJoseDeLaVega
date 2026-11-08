import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { DIAS_SEMANA, Horario, horaLegible, nombreCurso } from '../../../core/models/horario.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusService } from '../../../core/services/campus.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { HorarioSemanalComponent } from '../../../shared/horario/horario-semanal.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent, estudiantesVisibles } from '../compartido/selector-estudiante.component';

/** Horario de clases de la semana: el del docente, el del curso del estudiante o el del hijo del acudiente. */
@Component({
  selector: 'app-horario-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, HorarioSemanalComponent, EncabezadoCampusComponent, SelectorEstudianteComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Horario de clases" subtitulo="Clases de lunes a sábado" icono="schedule" />
      @if (!esDocente()) {
        <app-selector-estudiante [(estudianteId)]="estudianteId" />
      }

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando horario" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (horario(); as h) {
        @if (h.bloques.length) {
          <div class="acciones no-imprimir">
            <button mat-stroked-button type="button" (click)="imprimir()"><mat-icon>print</mat-icon> Imprimir</button>
          </div>
          <section class="tarjeta calendario" aria-label="Horario semanal">
            <app-horario-semanal [bloques]="h.bloques" [vista]="esDocente() ? 'docente' : 'curso'" />
          </section>

          <!-- En el celular la lista por día se lee mejor que la cuadrícula. -->
          <ol class="por-dia">
            @for (d of dias(); track d.dia) {
              <li class="tarjeta">
                <h2>{{ d.nombre }}</h2>
                <ul>
                  @for (b of d.clases; track b.id) {
                    <li>
                      <span class="hora">{{ horaLegible(b.inicio) }} – {{ horaLegible(b.fin) }}</span>
                      <strong>{{ esDocente() ? nombreCurso(b.grado, b.grupo) : b.asignatura }}</strong>
                      <span>{{ esDocente() ? b.asignatura : b.docenteNombre }}</span>
                    </li>
                  }
                </ul>
              </li>
            }
          </ol>
        } @else {
          <p class="tarjeta vacio">
            <mat-icon aria-hidden="true">event_busy</mat-icon>
            El colegio todavía no ha publicado el horario {{ esDocente() ? 'de sus clases' : 'de este curso' }}.
          </p>
        }
      }
    </div>
  `,
  styles: `
    .acciones { display: flex; justify-content: flex-end; margin-block-end: 0.75rem; }
    .calendario { padding: 0.75rem; }
    .por-dia { display: none; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
    .por-dia h2 { margin: 0 0 0.5rem; font-size: 1rem; }
    .por-dia ul { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
    .por-dia ul li { display: grid; }
    .hora { font-size: 0.8rem; color: var(--jv-texto-suave); }
    .vacio { display: flex; align-items: center; gap: 0.5rem; color: var(--jv-texto-suave); }
    .aviso-error { color: var(--jv-rojo); }

    @media (max-width: 720px) {
      .calendario, .acciones { display: none; }
      .por-dia { display: grid; }
    }
  `,
})
export class HorarioCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);
  readonly #campus = inject(CampusService);

  protected readonly horaLegible = horaLegible;
  protected readonly nombreCurso = nombreCurso;
  protected readonly esDocente = computed(() => this.#campus.perfil()?.rol === 'Docente');
  protected readonly estudianteId = signal<string | null>(null);
  protected readonly horario = signal<Horario | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly dias = computed(() => {
    const bloques = this.horario()?.bloques ?? [];
    return [1, 2, 3, 4, 5, 6]
      .map((dia) => ({ dia, nombre: DIAS_SEMANA[dia], clases: bloques.filter((b) => b.dia === dia) }))
      .filter((d) => d.clases.length);
  });

  constructor() {
    effect(() => {
      if (this.esDocente()) {
        void this.#cargar(null);
        return;
      }
      const visibles = estudiantesVisibles(this.#campus);
      const id = this.estudianteId() ?? (visibles.length === 1 ? visibles[0].id : null);
      if (id) {
        void this.#cargar(id);
      }
    });
  }

  protected imprimir(): void {
    window.print();
  }

  async #cargar(estudianteId: string | null): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.horario.set(await this.#servicio.miHorario(estudianteId));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}

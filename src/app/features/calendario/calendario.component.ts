import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Evento } from '../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../core/services/comunicaciones.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { CalendarioEventosComponent } from '../../shared/calendario/calendario-eventos.component';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/** Calendario escolar público: eventos institucionales, festivos y fechas académicas. */
@Component({
  selector: 'app-calendario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, CalendarioEventosComponent, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Calendario escolar"
        subtitulo="Fechas institucionales, entregas de boletines, festivos y eventos de los próximos meses"
        etiqueta="Comunidad educativa"
      />
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      @if (eventos(); as lista) {
        <app-calendario-eventos [eventos]="lista" />
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando calendario" />
      }
    </div>
  `,
  styles: `
    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class CalendarioComponent {
  readonly #servicio = inject(ComunicacionesService);
  protected readonly eventos = signal<Evento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.#servicio
      .calendarioPublico()
      .then((lista) => this.eventos.set(lista))
      .catch((error: unknown) => this.error.set(mensajeDeError(error)));
  }
}

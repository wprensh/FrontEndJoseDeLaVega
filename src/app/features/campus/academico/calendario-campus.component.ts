import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Evento } from '../../../core/models/comunicaciones.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { CalendarioEventosComponent } from '../../../shared/calendario/calendario-eventos.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Calendario escolar del campus: incluye los eventos internos (reuniones, cierres de notas). */
@Component({
  selector: 'app-calendario-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, CalendarioEventosComponent, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Calendario escolar" subtitulo="Próximos tres meses" icono="calendar_month" />
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
export class CalendarioCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);
  protected readonly eventos = signal<Evento[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.#servicio
      .calendario()
      .then((lista) => this.eventos.set(lista))
      .catch((error: unknown) => this.error.set(mensajeDeError(error)));
  }
}

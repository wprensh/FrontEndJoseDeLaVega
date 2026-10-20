import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { Resultados } from '../../core/models/eleccion.model';
import { CampusService } from '../../core/services/campus.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { ResultadosEleccionComponent } from '../../shared/elecciones/resultados-eleccion.component';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/** Resultados en el campus: al cierre para todos; durante la jornada, la participación para los docentes. */
@Component({
  selector: 'app-resultados-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, PageHeadingComponent, ResultadosEleccionComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        [titulo]="resultados()?.nombre ?? 'Resultados'"
        [subtitulo]="resultados()?.conteoDisponible ? 'Resultados de la votación' : 'Participación por grado durante la jornada'"
        etiqueta="Elecciones escolares"
      />
      <div class="barra">
        <a mat-button routerLink="/campus">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          Volver al campus
        </a>
        @if (resultados() && !resultados()!.conteoDisponible) {
          <button mat-stroked-button type="button" (click)="cargar(id())">
            <mat-icon aria-hidden="true">refresh</mat-icon>
            Actualizar
          </button>
        }
      </div>
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      } @else if (resultados()) {
        <app-resultados-eleccion [resultados]="resultados()!" />
      } @else {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando resultados" />
      }
    </div>
  `,
  styles: `
    .barra {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-block-end: 1rem;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ResultadosCampusComponent {
  readonly id = input.required<string>();

  readonly #campus = inject(CampusService);
  protected readonly resultados = signal<Resultados | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => void this.cargar(this.id()));
  }

  protected async cargar(id: string): Promise<void> {
    this.error.set(null);
    try {
      this.resultados.set(await this.#campus.resultados(id));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}

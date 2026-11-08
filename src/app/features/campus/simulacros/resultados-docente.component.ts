import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ResultadosSimulacro, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { ResultadosSimulacroComponent } from '../../../shared/simulacros/resultados-simulacro.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Resultados de un simulacro en los cursos del docente. */
@Component({
  selector: 'app-resultados-docente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBarModule, EncabezadoCampusComponent, ResultadosSimulacroComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        [titulo]="resultados()?.simulacro?.titulo ?? 'Resultados'"
        [subtitulo]="resultados() ? tipos[resultados()!.simulacro.tipo] + ' · resultados de sus cursos' : ''"
        icono="insights"
        volverA="/campus/simulacros"
        textoVolver="Simulacros"
      />
      @if (error(); as e) {
        <p class="tarjeta aviso-error" role="alert">{{ e }}</p>
      }
      @if (resultados(); as r) {
        <app-resultados-simulacro [resultados]="r" />
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando resultados" />
      }
    </div>
  `,
  styles: `
    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ResultadosDocenteComponent implements OnInit {
  readonly id = input.required<string>();
  readonly #servicio = inject(CampusAcademicoService);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly resultados = signal<ResultadosSimulacro | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.resultados.set(await this.#servicio.resultadosSimulacro(this.id()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Boletin, Periodo } from '../../../core/models/academico.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BoletinDocumentoComponent, imprimirBoletines } from '../../../shared/boletin-documento/boletin-documento.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent } from '../compartido/selector-estudiante.component';

/** Boletines publicados del estudiante (o de los hijos del acudiente), listos para imprimir o guardar en PDF. */
@Component({
  selector: 'app-boletines-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    BoletinDocumentoComponent,
    EncabezadoCampusComponent,
    SelectorEstudianteComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Boletines" subtitulo="Informe académico de cada periodo publicado" icono="grading">
        @if (boletin()) {
          <button mat-flat-button class="boton-azul" type="button" (click)="imprimir()">
            <mat-icon aria-hidden="true">print</mat-icon>
            Imprimir o guardar PDF
          </button>
        }
      </app-encabezado-campus>

      <app-selector-estudiante [(estudianteId)]="estudianteId" />

      @if (periodos(); as lista) {
        @if (lista.length) {
          <mat-button-toggle-group
            class="periodos no-imprimir"
            aria-label="Periodo"
            [value]="periodoId()"
            (change)="periodoId.set($event.value)"
          >
            @for (p of lista; track p.id) {
              <mat-button-toggle [value]="p.id">{{ p.nombre }}</mat-button-toggle>
            }
          </mat-button-toggle-group>
        } @else {
          <p class="tarjeta vacio">Todavía no hay boletines publicados. El colegio avisa aquí cuando se publiquen.</p>
        }
      }

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando boletín" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      @if (boletin(); as b) {
        <app-boletin-documento [boletin]="b" />
      }
    </div>
  `,
  styles: `
    .periodos {
      flex-wrap: wrap;
      margin-block-end: 1rem;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class BoletinesCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);

  protected readonly estudianteId = signal<string | null>(null);
  protected readonly periodoId = signal<string | null>(null);
  protected readonly periodos = signal<Periodo[] | null>(null);
  protected readonly boletin = signal<Boletin | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.#cargarPeriodos();
    effect(() => {
      const estudiante = this.estudianteId();
      const periodo = this.periodoId();
      if (estudiante && periodo) {
        void this.#cargarBoletin(estudiante, periodo);
      }
    });
  }

  protected imprimir(): void {
    imprimirBoletines();
  }

  async #cargarPeriodos(): Promise<void> {
    try {
      const disponibles = await this.#servicio.boletinesDisponibles();
      const periodos = [...disponibles.periodos].sort((a, b) => a.numero - b.numero);
      this.periodos.set(periodos);
      // Por defecto, el último periodo publicado.
      this.periodoId.set(periodos.at(-1)?.id ?? null);
    } catch (error) {
      this.periodos.set([]);
      this.error.set(mensajeDeError(error));
    }
  }

  async #cargarBoletin(estudianteId: string, periodoId: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.boletin.set(await this.#servicio.boletin(estudianteId, periodoId));
    } catch (error) {
      this.boletin.set(null);
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, model } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { EstudianteVinculado, cursoDe } from '../../../core/models/campus.model';
import { CampusService } from '../../../core/services/campus.service';

/** Estudiantes cuya información puede ver quien está en el campus: él mismo o, si es acudiente, sus hijos. */
export function estudiantesVisibles(campus: CampusService): EstudianteVinculado[] {
  const perfil = campus.perfil();
  if (!perfil) {
    return [];
  }
  if (perfil.rol === 'Acudiente') {
    return [...(perfil.estudiantes ?? [])];
  }
  if (perfil.rol === 'Estudiante') {
    return [
      {
        id: perfil.id,
        nombreCompleto: perfil.nombreCompleto,
        documento: perfil.documento,
        grado: perfil.grado,
        grupo: perfil.grupo,
        parentesco: null,
      },
    ];
  }
  return [];
}

/**
 * Para acudientes con varios hijos: botones para elegir de quién ver la información.
 * Con un solo estudiante no muestra nada y lo deja elegido.
 */
@Component({
  selector: 'app-selector-estudiante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggleModule],
  template: `
    @if (estudiantes().length > 1) {
      <mat-button-toggle-group
        class="selector no-imprimir"
        aria-label="Estudiante"
        [value]="estudianteId()"
        (change)="estudianteId.set($event.value)"
      >
        @for (e of estudiantes(); track e.id) {
          <mat-button-toggle [value]="e.id">{{ primerNombre(e.nombreCompleto) }} · {{ cursoDe(e) }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    } @else if (estudiantes().length === 0) {
      <p class="tarjeta vacio">
        Aún no tiene estudiantes vinculados. Pida en la secretaría que lo registren como acudiente de su hijo o hija.
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .selector {
      flex-wrap: wrap;
      margin-block-end: 1rem;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }
  `,
})
export class SelectorEstudianteComponent {
  readonly #campus = inject(CampusService);

  /** Id del estudiante elegido. */
  readonly estudianteId = model<string | null>(null);

  protected readonly estudiantes = computed(() => estudiantesVisibles(this.#campus));
  protected readonly cursoDe = cursoDe;

  constructor() {
    effect(() => {
      const lista = this.estudiantes();
      const actual = this.estudianteId();
      if (lista.length && !lista.some((e) => e.id === actual)) {
        this.estudianteId.set(lista[0].id);
      }
    });
  }

  protected primerNombre(nombre: string): string {
    return nombre.split(' ')[0];
  }
}

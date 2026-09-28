import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

interface Nivel {
  readonly nombre: string;
  readonly descripcion: string;
  readonly icono: string;
  readonly franja: 'franja-azul' | 'franja-amarilla' | 'franja-roja';
  readonly colorIcono: string;
}

/** Plantilla 2: Propuesta académica y niveles educativos. */
@Component({
  selector: 'app-academico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Propuesta Académica & Niveles"
        subtitulo="Plan de estudios, Proyecto Educativo Institucional (PEI) y grados"
        etiqueta="Calendario A oficial"
      />

      <ul class="niveles">
        @for (nivel of niveles; track nivel.nombre) {
          <li class="tarjeta-franja" [class]="nivel.franja">
            <mat-icon aria-hidden="true" [style.color]="nivel.colorIcono">{{ nivel.icono }}</mat-icon>
            <h2>{{ nivel.nombre }}</h2>
            <p>{{ nivel.descripcion }}</p>
          </li>
        }
      </ul>

      <section class="pei">
        <div>
          <h2>Proyecto Educativo Institucional (PEI)</h2>
          <p>Consulte el modelo pedagógico y manual de convivencia de la I.E. José de la Vega.</p>
        </div>
        <!-- Publique el documento en public/docs/pei.pdf -->
        <a mat-flat-button class="boton-institucional" href="docs/pei.pdf" download>Descargar PEI (PDF)</a>
      </section>
    </div>
  `,
  styles: `
    .niveles {
      list-style: none;
      margin: 0 0 1.25rem;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    h2 { font-size: 1.1rem; margin: 0.5rem 0 0.25rem; }
    p { margin: 0; color: var(--jv-texto-suave); font-size: 0.92rem; }
    .pei {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      background: var(--jv-azul);
      border-radius: var(--jv-radio);
      padding: 1.4rem 1.75rem;
    }
    .pei h2 { color: var(--jv-amarillo); text-transform: uppercase; margin-block-start: 0; }
    .pei p { color: #d9e2f0; }
  `,
})
export class AcademicoComponent {
  protected readonly niveles: readonly Nivel[] = [
    {
      nombre: 'Preescolar',
      descripcion: 'Grados Transición y Pre-Jardín. Desarrollo socioafectivo.',
      icono: 'child_care',
      franja: 'franja-azul',
      colorIcono: 'var(--jv-azul)',
    },
    {
      nombre: 'Primaria',
      descripcion: 'Grados 1° a 5°. Competencias lectoras y pensamiento lógico.',
      icono: 'menu_book',
      franja: 'franja-amarilla',
      colorIcono: 'var(--jv-naranja)',
    },
    {
      nombre: 'Secundaria',
      descripcion: 'Grados 6° a 9°. Ciencias, matemáticas y ciudadanía.',
      icono: 'biotech',
      franja: 'franja-roja',
      colorIcono: 'var(--jv-rojo)',
    },
    {
      nombre: 'Media Académica',
      descripcion: 'Grados 10° y 11°. Preparación Saber 11 y orientación vocacional.',
      icono: 'school',
      franja: 'franja-azul',
      colorIcono: 'var(--jv-azul)',
    },
  ];
}

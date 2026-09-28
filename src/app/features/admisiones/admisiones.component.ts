import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

interface Paso {
  readonly titulo: string;
  readonly descripcion: string;
  readonly color: string;
  /** Color del número; por defecto el mismo del borde. */
  readonly colorNumero?: string;
}

/** Plantilla 3: Admisiones e inscripción de cupos. */
@Component({
  selector: 'app-admisiones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Admisiones & Inscripción de Cupos"
        subtitulo="Paso a paso para matrículas de nuevos estudiantes y renovación"
        etiqueta="Secretaría de Educación Distrital"
      />

      <ol class="pasos">
        @for (paso of pasos; track paso.titulo; let i = $index) {
          <li class="paso" [style.--color-paso]="paso.color" [style.--color-numero]="paso.colorNumero ?? paso.color">
            <span class="numero" aria-hidden="true">{{ (i + 1).toString().padStart(2, '0') }}</span>
            <h2>{{ paso.titulo }}</h2>
            <p>{{ paso.descripcion }}</p>
          </li>
        }
      </ol>

      <section class="tarjeta horario">
        <div>
          <h2>Horario de Atención para Admisiones:</h2>
          <p>Lunes a Viernes de 7:30 a.m. a 12:30 p.m. - Sede Principal Torices</p>
        </div>
        <!-- Publique el documento en public/docs/requisitos-admision.pdf -->
        <a mat-flat-button class="boton-azul" href="docs/requisitos-admision.pdf" download>
          Descargar requisitos (PDF)
        </a>
      </section>
    </div>
  `,
  styles: `
    .pasos {
      list-style: none;
      margin: 0 0 1rem;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }
    .paso {
      background: var(--jv-superficie);
      border: 2px solid var(--color-paso);
      border-top-width: 6px;
      border-radius: 6px;
      padding: 1rem 1.2rem;
    }
    .numero { font: 700 1.7rem / 1 var(--jv-fuente-titulos); color: var(--color-numero); }
    h2 { font-size: 1.05rem; margin: 0.6rem 0 0.25rem; }
    p { margin: 0; color: var(--jv-texto-suave); font-size: 0.92rem; }
    .horario { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .horario h2 { margin-block-start: 0; font-size: 1rem; }
  `,
})
export class AdmisionesComponent {
  protected readonly pasos: readonly Paso[] = [
    {
      titulo: 'Registro de Solicitud',
      descripcion: 'Diligenciamiento del formulario institucional o plataforma de la SED Cartagena.',
      color: 'var(--jv-azul)',
    },
    {
      titulo: 'Anexo Documental',
      descripcion: 'Copia de registro civil/TI, boletines académicos previos y certificado EPS.',
      color: 'var(--jv-amarillo)',
      colorNumero: 'var(--jv-naranja)',
    },
    {
      titulo: 'Firma de Matrícula',
      descripcion: 'Formalización presencial en secretaría académica por parte del acudiente.',
      color: 'var(--jv-rojo)',
    },
  ];
}

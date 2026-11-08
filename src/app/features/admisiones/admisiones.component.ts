import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';
import { ConsultaAdmisionComponent } from './consulta-admision.component';
import { PreMatriculaComponent } from './pre-matricula.component';

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
  imports: [MatButtonModule, MatTabsModule, ConsultaAdmisionComponent, PageHeadingComponent, PreMatriculaComponent],
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

      <section class="tarjeta en-linea" id="pre-matricula">
        <h2>Pre-matrícula en línea</h2>
        <p class="ayuda">
          Radique la solicitud de cupo desde la casa, cargue los documentos escaneados o en foto y consulte el estado cuando
          quiera con su número de radicado. Secretaría le escribirá por WhatsApp o correo si falta algo.
        </p>
        <mat-tab-group animationDuration="0ms" [selectedIndex]="pestana()" (selectedIndexChange)="pestana.set($event)">
          <mat-tab label="Solicitar cupo">
            <div class="contenido-pestana">
              <app-pre-matricula (consultar)="abrirConsulta($event)" />
            </div>
          </mat-tab>
          <mat-tab label="Consultar mi solicitud">
            <div class="contenido-pestana">
              <app-consulta-admision [inicial]="consulta()" />
            </div>
          </mat-tab>
        </mat-tab-group>
      </section>

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
    .en-linea { margin-block-end: 1rem; }
    .en-linea h2 { margin: 0 0 0.25rem; font-size: 1.2rem; color: var(--jv-azul); }
    .ayuda { margin-block-end: 0.5rem; }
    .contenido-pestana { padding-block: 1rem 0.25rem; }
    .horario { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .horario h2 { margin-block-start: 0; font-size: 1rem; }
  `,
})
export class AdmisionesComponent {
  protected readonly pestana = signal(0);
  protected readonly consulta = signal<{ radicado: string; documento: string } | null>(null);

  protected abrirConsulta(datos: { radicado: string; documento: string }): void {
    this.consulta.set(datos);
    this.pestana.set(1);
  }

  protected readonly pasos: readonly Paso[] = [
    {
      titulo: 'Registro de Solicitud',
      descripcion: 'Diligencie la pre-matrícula en línea en esta página (o el formulario de la SED Cartagena) y guarde su número de radicado.',
      color: 'var(--jv-azul)',
    },
    {
      titulo: 'Anexo Documental',
      descripcion: 'Cargue en línea el registro civil o TI, el certificado de notas, el carné de vacunas y el certificado de EPS.',
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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

interface Servicio {
  readonly nombre: string;
  readonly descripcion: string;
  readonly icono: string;
  readonly franja: 'franja-azul' | 'franja-amarilla' | 'franja-roja';
  readonly colorIcono: string;
}

/** Plantilla 4: Servicios institucionales y bienestar. */
@Component({
  selector: 'app-servicios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Servicios Institucionales & Bienestar"
        subtitulo="Apoyo psicosocial, alimentación PAE, biblioteca y actividades extracurriculares"
        etiqueta="Comunidad estudiantil"
      />

      <ul class="servicios">
        @for (servicio of servicios; track servicio.nombre) {
          <li class="tarjeta-lateral" [class]="servicio.franja">
            <mat-icon aria-hidden="true" [style.color]="servicio.colorIcono">{{ servicio.icono }}</mat-icon>
            <div>
              <h2>{{ servicio.nombre }}</h2>
              <p>{{ servicio.descripcion }}</p>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .servicios {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
      gap: 1rem;
    }
    li { display: flex; gap: 0.9rem; align-items: flex-start; }
    mat-icon { flex: none; margin-block-start: 0.1rem; }
    h2 { font-size: 1.05rem; margin: 0 0 0.2rem; }
    p { margin: 0; color: var(--jv-texto-suave); font-size: 0.92rem; }
  `,
})
export class ServiciosComponent {
  protected readonly servicios: readonly Servicio[] = [
    {
      nombre: 'Orientación Escolar',
      descripcion: 'Atención psicológica, acompañamiento en convivencia y talleres para padres de familia.',
      icono: 'psychology',
      franja: 'franja-azul',
      colorIcono: 'var(--jv-azul)',
    },
    {
      nombre: 'Programa PAE',
      descripcion: 'Complemento nutricional diario garantizado para la población estudiantil en la sede.',
      icono: 'restaurant',
      franja: 'franja-amarilla',
      colorIcono: 'var(--jv-naranja)',
    },
    {
      nombre: 'Sala de Informática & Biblioteca',
      descripcion: 'Acceso a equipos de cómputo, internet y textos de consulta académica guiada.',
      icono: 'computer',
      franja: 'franja-roja',
      colorIcono: 'var(--jv-rojo)',
    },
    {
      nombre: 'Banda de Paz & Deportes',
      descripcion: 'Formatos artísticos, disciplinas deportivas y representación en eventos distritales.',
      icono: 'sports_soccer',
      franja: 'franja-azul',
      colorIcono: 'var(--jv-azul)',
    },
  ];
}

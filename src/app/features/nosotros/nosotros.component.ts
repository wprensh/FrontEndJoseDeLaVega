import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/** Plantilla 1: Nosotros y Misión Institucional. */
@Component({
  selector: 'app-nosotros',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Nosotros & Misión Institucional"
        subtitulo="Historia, filosofía y valores educativos en Cartagena"
        etiqueta="Módulo institucional"
      />

      <div class="rejilla">
        <div class="columna">
          <section class="tarjeta-lateral franja-azul resena">
            <h2><mat-icon aria-hidden="true">account_balance</mat-icon> Reseña Histórica</h2>
            <p>Fundada con la vocación de brindar educación pública de alta calidad en el sector de Torices y Santa Rita.</p>
            <p>Formamos ciudadanos íntegros comprometidos con el desarrollo de Cartagena.</p>
          </section>

          <div class="mision-vision">
            <section class="tarjeta-franja franja-amarilla">
              <h2>Misión</h2>
              <p>Formación integral con pensamiento crítico, inclusión y valores éticos.</p>
            </section>
            <section class="tarjeta-franja franja-roja">
              <h2>Visión</h2>
              <p>Liderazgo académico e innovación pedagógica en el distrito para 2030.</p>
            </section>
          </div>
        </div>

        <figure class="tarjeta sede">
          <!-- Foto propia: copie public/img/sede.jpg y defina la variable CSS jv-foto-sede en styles.scss -->
          <div class="sede-foto" role="img" aria-label="Estudiantes de la sede principal">
            <mat-icon aria-hidden="true">school</mat-icon>
          </div>
          <figcaption>
            <strong>Sede Principal - Santa Rita</strong>
            <span>Calle Principal #53-52, Cartagena</span>
          </figcaption>
        </figure>
      </div>
    </div>
  `,
  styles: `
    .rejilla {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
    }
    .columna { display: grid; gap: 1rem; }
    h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; margin: 0 0 0.5rem; }
    h2 mat-icon { color: var(--jv-amarillo); }
    p { margin: 0 0 0.4rem; color: var(--jv-texto-suave); }
    .resena p { color: var(--jv-texto); }
    .mision-vision { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .sede { margin: 0; padding: 1rem; }
    .sede-foto {
      display: grid;
      place-items: center;
      aspect-ratio: 16 / 6.5;
      border-radius: 6px;
      background: var(--jv-foto-sede, none) center / cover, linear-gradient(135deg, var(--jv-azul-medio), var(--jv-azul));
      color: rgb(255 255 255 / 70%);
    }
    .sede-foto mat-icon { font-size: 64px; inline-size: 64px; block-size: 64px; }
    figcaption {
      display: grid;
      text-align: center;
      margin-block-start: 0.75rem;
      background: var(--jv-superficie-suave);
      border-radius: 6px;
      padding: 0.6rem;
    }
    figcaption strong { font: 700 0.9rem / 1.4 var(--jv-fuente-titulos); text-transform: uppercase; color: var(--jv-azul); }
    figcaption span { font-size: 0.85rem; color: var(--jv-texto-suave); }
    @media (max-width: 900px) {
      .rejilla, .mision-vision { grid-template-columns: 1fr; }
    }
  `,
})
export class NosotrosComponent {}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Encabezado de las páginas internas del campus: volver al inicio del campus, ícono y título. */
@Component({
  selector: 'app-encabezado-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <a mat-button class="volver no-imprimir" [routerLink]="volverA()">
      <mat-icon aria-hidden="true">arrow_back</mat-icon>
      {{ textoVolver() }}
    </a>
    <header class="encabezado">
      <mat-icon class="icono" aria-hidden="true">{{ icono() }}</mat-icon>
      <div>
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="extra"><ng-content /></div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      margin-block-end: 1.25rem;
    }

    .volver {
      margin-inline-start: -0.75rem;
      margin-block-end: 0.5rem;
    }

    .encabezado {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1.1rem 1.4rem;
      background: var(--jv-superficie);
      border: 1px solid var(--jv-borde);
      border-left: 5px solid var(--jv-amarillo);
      border-radius: 2px;
    }

    .icono {
      color: var(--jv-azul-medio);
      font-size: 38px;
      inline-size: 38px;
      block-size: 38px;
    }

    h1 {
      margin: 0;
      color: var(--jv-azul);
      font-family: var(--jv-fuente-titulos);
      font-size: clamp(1.25rem, 3vw, 1.6rem);
    }

    p {
      margin: 0.2rem 0 0;
      color: var(--jv-texto-suave);
    }

    .extra {
      margin-inline-start: auto;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    @media print {
      .encabezado {
        border: none;
        padding: 0;
      }
    }
  `,
})
export class EncabezadoCampusComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
  readonly icono = input('school');
  readonly volverA = input<string | unknown[]>('/campus');
  readonly textoVolver = input('Inicio del campus');
}

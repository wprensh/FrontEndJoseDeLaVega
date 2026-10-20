import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { iniciales } from '../../core/models/eleccion.model';
import { resolverUrlRecurso } from '../../core/utils/url-recurso';

/** Foto del candidato, o sus iniciales sobre el azul institucional si no tiene o no carga. */
@Component({
  selector: 'app-foto-candidato',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url() && !fallo()) {
      <img [src]="url()" [alt]="'Foto de ' + nombre()" loading="lazy" (error)="fallo.set(true)" />
    } @else {
      <span class="iniciales" aria-hidden="true">{{ letras() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      inline-size: var(--tamano, 72px);
      block-size: var(--tamano, 72px);
      flex: none;
      border-radius: 50%;
      overflow: hidden;
      background: var(--jv-azul);
      border: 3px solid var(--jv-amarillo);
    }

    img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }

    .iniciales {
      color: #fff;
      font-family: var(--jv-fuente-titulos);
      font-weight: 700;
      font-size: calc(var(--tamano, 72px) * 0.36);
    }
  `,
})
export class FotoCandidatoComponent {
  readonly nombre = input.required<string>();
  readonly fotoUrl = input<string | null>(null);

  protected readonly fallo = signal(false);
  protected readonly url = computed(() => {
    const foto = this.fotoUrl();
    return foto ? resolverUrlRecurso(foto) : null;
  });
  protected readonly letras = computed(() => iniciales(this.nombre()));
}

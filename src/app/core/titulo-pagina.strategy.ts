import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { INSTITUCION } from './institucion';

/** Título de la pestaña del navegador: "Nosotros | I.E. José de la Vega". */
@Injectable({ providedIn: 'root' })
export class TituloPaginaStrategy extends TitleStrategy {
  readonly #title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const titulo = this.buildTitle(snapshot);
    this.#title.setTitle(titulo ? `${titulo} | ${INSTITUCION.nombreCorto}` : INSTITUCION.nombre);
  }
}

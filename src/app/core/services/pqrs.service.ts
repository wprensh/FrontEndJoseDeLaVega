import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PqrsRadicada, RadicarPqrs } from '../models/pqrs.model';

/** Envío del formulario PQRS de la sección "Contacto". */
@Injectable({ providedIn: 'root' })
export class PqrsService {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.apiBaseUrl}/pqrs`;

  radicar(datos: RadicarPqrs): Promise<PqrsRadicada> {
    return firstValueFrom(this.#http.post<PqrsRadicada>(this.#url, datos));
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

  /**
   * Comprueba si la clave de administración actual es válida consultando un endpoint protegido.
   * Devuelve false si la API responde 401; cualquier otro error se propaga.
   */
  async verificarAccesoAdmin(): Promise<boolean> {
    try {
      await firstValueFrom(this.#http.get(this.#url, { params: { tamanoPagina: 1 } }));
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return false;
      }
      throw error;
    }
  }
}

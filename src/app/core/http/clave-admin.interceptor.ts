import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SesionAdminService } from '../services/sesion-admin.service';

export const ENCABEZADO_CLAVE_ADMIN = 'X-Clave-Admin';

/**
 * Agrega la clave de administración a las peticiones hacia la API propia (nunca a otros dominios).
 * Si la API responde 401, la clave guardada ya no sirve y se descarta.
 */
export const claveAdminInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionAdminService);
  const clave = sesion.clave();

  if (!clave || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [ENCABEZADO_CLAVE_ADMIN]: clave } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sesion.cerrar();
      }
      return throwError(() => error);
    }),
  );
};

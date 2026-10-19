import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SesionService } from '../services/sesion.service';

/**
 * Agrega el token de la sesión a las peticiones hacia la API propia (nunca a otros dominios).
 * Si la API responde 401, la sesión venció o fue cerrada (usuario desactivado, contraseña restablecida):
 * se descarta y se lleva al inicio de sesión, que luego devuelve a la misma página.
 */
export const autenticacionInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  const token = sesion.token();

  if (!token || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && sesion.token() === token) {
        sesion.cerrar();
        void router.navigate(['/admin/login'], { queryParams: { volver: router.url, motivo: 'vencida' } });
      }
      return throwError(() => error);
    }),
  );
};

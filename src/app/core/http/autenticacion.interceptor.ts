import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CampusService, URL_CAMPUS } from '../services/campus.service';
import { SesionService } from '../services/sesion.service';

/**
 * Agrega el token de la sesión a las peticiones hacia la API propia (nunca a otros dominios):
 * el del campus virtual a /api/campus y el del panel administrativo al resto.
 * Si la API responde 401, la sesión venció o fue cerrada (usuario desactivado, clave cambiada):
 * se descarta y se lleva a la página de ingreso que corresponda.
 */
export const autenticacionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const router = inject(Router);
  const esCampus = req.url.startsWith(`${URL_CAMPUS}/`);
  const campus = inject(CampusService);
  const sesion = inject(SesionService);
  const token = esCampus ? campus.token() : sesion.token();

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (esCampus && campus.token() === token) {
          campus.cerrar();
          void router.navigate(['/campus'], { queryParams: { motivo: 'vencida' } });
        } else if (!esCampus && sesion.token() === token) {
          sesion.cerrar();
          void router.navigate(['/admin/login'], { queryParams: { volver: router.url, motivo: 'vencida' } });
        }
      }
      return throwError(() => error);
    }),
  );
};

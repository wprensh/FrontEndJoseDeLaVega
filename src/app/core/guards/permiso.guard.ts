import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Modulo } from '../models/usuario.model';
import { CampusService } from '../services/campus.service';
import { SesionService } from '../services/sesion.service';

/** Exige una sesión iniciada; si no la hay, lleva al inicio de sesión y luego regresa. */
export const requiereSesion: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(SesionService);
  return sesion.activa() || inject(Router).createUrlTree(['/admin/login'], { queryParams: { volver: estado.url } });
};

/**
 * Exige permiso para ver el módulo. Sin sesión lleva al inicio de sesión;
 * con sesión pero sin permiso, al panel, donde solo aparecen los módulos asignados.
 */
export function requierePermiso(modulo: Modulo): CanActivateFn {
  return (_ruta, estado) => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    if (!sesion.activa()) {
      return router.createUrlTree(['/admin/login'], { queryParams: { volver: estado.url } });
    }
    return sesion.puede(modulo, 'Ver') || router.createUrlTree(['/admin'], { queryParams: { sinPermiso: modulo } });
  };
}

/** Páginas del campus que exigen haber ingresado como estudiante o docente. */
export const requiereSesionCampus: CanActivateFn = () =>
  inject(CampusService).activa() || inject(Router).createUrlTree(['/campus']);

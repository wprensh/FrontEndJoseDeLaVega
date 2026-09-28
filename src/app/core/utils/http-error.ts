import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

import { ProblemDetails } from '../models/api.models';

/** Convierte cualquier error HTTP en un mensaje legible para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No fue posible conectar con el servidor. Verifique su conexión e intente de nuevo.';
    }
    if (error.status === 429) {
      return 'Ha enviado demasiadas solicitudes. Espere un minuto e intente de nuevo.';
    }
    const problema = error.error as ProblemDetails | null;
    return problema?.title ?? 'Ocurrió un error inesperado. Intente de nuevo más tarde.';
  }
  return 'Ocurrió un error inesperado. Intente de nuevo más tarde.';
}

/**
 * Traslada los errores de validación del servidor (ValidationProblemDetails.errors)
 * a los controles del formulario, para mostrarlos junto a cada campo.
 * Devuelve true si el error era de validación.
 */
export function aplicarErroresDeServidor(formulario: FormGroup, error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return false;
  }

  const errores = (error.error as ProblemDetails | null)?.errors ?? {};
  for (const [campo, mensajes] of Object.entries(errores)) {
    // El backend usa PascalCase ("Titulo"); el formulario usa camelCase ("titulo").
    const control: AbstractControl | null = formulario.get(campo.charAt(0).toLowerCase() + campo.slice(1));
    control?.setErrors({ servidor: mensajes[0] });
    control?.markAsTouched();
  }
  return true;
}

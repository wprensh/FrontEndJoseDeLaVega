import { ArchivoAula, MAXIMO_ARCHIVO_AULA } from '../../../core/models/mejoras.model';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { descargarBlob } from '../../../core/utils/csv';

/** Revisa el tamaño antes de subir: el servidor rechaza archivos de más de 5 MB. */
export function archivoValido(archivo: File): string | null {
  return archivo.size > MAXIMO_ARCHIVO_AULA ? 'El archivo pesa más de 5 MB. Comprímalo o compártalo como enlace.' : null;
}

/** Descarga un archivo del aula con el token del campus. */
export async function descargarArchivoAula(servicio: CampusMejorasService, archivo: ArchivoAula): Promise<void> {
  descargarBlob(await servicio.descargarArchivo(archivo.id), archivo.nombreArchivo);
}

/** Icono según el tipo de archivo. */
export function iconoArchivo(archivo: ArchivoAula): string {
  if (archivo.tipoContenido.startsWith('image/')) {
    return 'image';
  }
  return archivo.tipoContenido === 'application/pdf' ? 'picture_as_pdf' : 'description';
}

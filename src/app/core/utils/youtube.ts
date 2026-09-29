/** Video de YouTube reconocido a partir de un enlace. */
export interface VideoYoutube {
  /** Id de 11 caracteres del video. */
  readonly id: string;
  /** true para YouTube Shorts (formato vertical 9:16). */
  readonly vertical: boolean;
}

const ID_VALIDO = /^[\w-]{11}$/;

/**
 * Reconoce los formatos habituales de enlace de YouTube:
 * youtube.com/watch?v=ID · youtu.be/ID · youtube.com/shorts/ID · youtube.com/embed/ID · youtube.com/live/ID
 * (con o sin www / m., y con parámetros extra como ?si=...). Devuelve null si no es un video de YouTube.
 */
export function analizarYoutube(enlace: string | null | undefined): VideoYoutube | null {
  if (!enlace) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(enlace.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const partes = url.pathname.split('/').filter(Boolean);
  let id: string | null = null;
  let vertical = false;

  if (host === 'youtu.be') {
    id = partes[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (partes[0] === 'watch') {
      id = url.searchParams.get('v');
    } else if (partes[0] === 'shorts' || partes[0] === 'embed' || partes[0] === 'live') {
      id = partes[1] ?? null;
      vertical = partes[0] === 'shorts';
    }
  }

  // Solo se acepta un id con el formato exacto de YouTube: es lo que se inserta en la URL del reproductor.
  return id && ID_VALIDO.test(id) ? { id, vertical } : null;
}

/** URL del reproductor en modo de privacidad mejorada (no guarda cookies hasta que se reproduce). */
export function urlReproductorYoutube(video: VideoYoutube): string {
  return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`;
}

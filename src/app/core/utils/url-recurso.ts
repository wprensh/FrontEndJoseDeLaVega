/**
 * Convierte una ruta del sitio ("/img/noticias/foto.png") en una dirección relativa a la base de la app.
 * Así funciona igual en la raíz de un dominio y en una subcarpeta, como GitHub Pages
 * (https://usuario.github.io/FrontEndJoseDeLaVega/img/noticias/foto.png).
 * Las URL absolutas (https://...) se devuelven sin cambios.
 */
export function resolverUrlRecurso(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//')) {
    return new URL(url.slice(1), document.baseURI).href;
  }
  return url;
}

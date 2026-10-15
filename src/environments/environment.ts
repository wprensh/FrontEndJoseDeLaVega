/**
 * Configuración de producción (GitHub Pages: https://wprensh.github.io/FrontEndJoseDeLaVega/).
 * GitHub Pages solo sirve archivos estáticos y no reenvía /api, así que se usa la URL completa de la API
 * en Render. La API acepta peticiones de https://wprensh.github.io (Cors__OrigenesPermitidos en render.yaml).
 * Si el sitio se publica en Vercel, también funciona con esta URL siempre que su dominio se agregue al CORS
 * de la API; o se puede volver a '/api' para usar el reenvío de vercel.json.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://josedelavega-api.onrender.com/api',
};

/**
 * Configuración de producción (GitHub Pages con dominio propio: https://iejosedelavega.edu.co;
 * antes https://wprensh.github.io/FrontEndJoseDeLaVega/, que GitHub redirige al dominio).
 * GitHub Pages solo sirve archivos estáticos y no reenvía /api, así que se usa la URL completa de la API
 * en Render. La API acepta peticiones de https://iejosedelavega.edu.co, https://www.iejosedelavega.edu.co
 * y https://wprensh.github.io (Cors:OrigenesPermitidos de la API).
 * Cuando api.iejosedelavega.edu.co esté activo en Render, se puede cambiar apiBaseUrl a
 * 'https://api.iejosedelavega.edu.co/api' (la dirección .onrender.com sigue funcionando).
 * Si el sitio se publica en Vercel, también funciona con esta URL siempre que su dominio se agregue al CORS
 * de la API; o se puede volver a '/api' para usar el reenvío de vercel.json.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://josedelavega-api.onrender.com/api',
};

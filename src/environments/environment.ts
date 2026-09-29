/**
 * Configuración de producción (GitHub Pages).
 * La API se publica en Render; el nombre sale de render.yaml del backend (servicio "josedelavega-api").
 * Si Render asigna otra dirección, o cuando el colegio use su dominio propio, se cambia aquí.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://josedelavega-api.onrender.com/api',
};

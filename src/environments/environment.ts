/**
 * Configuración de producción (Vercel).
 * La API se llama con una ruta relativa: Vercel reenvía /api/* a la API en Render (ver vercel.json).
 * Así el navegador habla con un solo dominio (sin CORS) y no importa qué dirección asigne Vercel
 * ni si luego el colegio usa un dominio propio. Si la API cambia de dirección, se cambia en vercel.json.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};

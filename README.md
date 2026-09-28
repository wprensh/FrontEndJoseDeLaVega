# Frontend · I.E. José de la Vega

Sitio web de la **Institución Educativa José de la Vega** (Cartagena de Indias) — *"Honor y Trabajo"*.
Construido con **Angular 19** (Standalone Components, Control Flow `@if`/`@for`, Signals) y **Angular Material 19**.

Backend: [BackEndJoseDeLaVega](https://github.com/wprensh/BackEndJoseDeLaVega) (.NET 9 + PostgreSQL)

## Plantillas incluidas

Basadas en el documento *Plantillas Web I.E. José de la Vega*, con la misma navegación y colores oficiales:

| Ruta | Plantilla | Datos |
|---|---|---|
| `/inicio` | Portada, valores, noticias recientes y eventos próximos | API (`GET /api/noticias`) |
| `/nosotros` | 1. Nosotros & Misión Institucional | Estático |
| `/academico` | 2. Propuesta Académica & Niveles | Estático |
| `/admisiones` | 3. Admisiones & Inscripción de Cupos | Estático |
| `/servicios` | 4. Servicios Institucionales & Bienestar | Estático |
| `/contacto` | 5. Contacto & Atención Ciudadana (formulario PQRS) | API (`POST /api/pqrs`) |
| `/campus` | 6. Campus Virtual & Plataforma Académica | Solo interfaz (sin autenticación aún) |
| `/admin/noticias` | Panel administrativo: tabla Material + formulario reactivo (CRUD) | API (CRUD `/api/noticias`) |

## Estructura

```
src/
├── app/
│   ├── core/                       # Singleton: modelos, servicios HTTP, utilidades
│   │   ├── models/                 #   Noticia, PQRS, PagedResult, ProblemDetails
│   │   ├── services/               #   NoticiasService (estado con Signals), PqrsService
│   │   ├── utils/                  #   Fechas (DateOnly) y errores HTTP → mensajes/validaciones
│   │   ├── institucion.ts          #   Datos institucionales y menú de navegación
│   │   ├── paginador-intl.ts       #   Textos del paginador en español
│   │   └── titulo-pagina.strategy.ts
│   ├── layout/                     # Encabezado y pie de página del sitio
│   ├── shared/                     # Componentes reutilizables (escudo, encabezado de sección, diálogo)
│   ├── features/                   # Una carpeta por sección, cargada de forma perezosa
│   │   ├── inicio/  nosotros/  academico/  admisiones/  servicios/  contacto/  campus/
│   │   └── admin/noticias-admin/   #   CRUD con MatTable + formulario reactivo
│   ├── app.component.ts            # Shell: header + <router-outlet> + footer
│   ├── app.config.ts               # Providers: router, HttpClient, Material, locale es-CO
│   └── app.routes.ts               # Rutas con loadComponent (lazy loading)
├── environments/                   # URL de la API por entorno
└── styles.scss                     # Tema Material 3 + tokens de color institucionales
```

## Requisitos

- Node.js 20.11+ o 22 LTS
- Backend en ejecución (por defecto en `http://localhost:5075`)

## Ejecutar

```bash
npm install
npm start            # http://localhost:4200
```

La URL de la API se configura en `src/environments/environment.development.ts` (desarrollo)
y `src/environments/environment.ts` (producción, `/api` bajo el mismo dominio).

## Compilar y probar

```bash
npm run build        # dist/front-end-jose-de-la-vega
npm test             # Karma + Jasmine
```

## Decisiones técnicas

- **Standalone + OnPush en todos los componentes**, `inject()` en lugar de inyección por constructor,
  `input()` basados en Signals y control flow nativo (`@if`, `@for` con `track`, `@empty`).
- **Signals para el estado**: `NoticiasService` expone `noticias`, `total`, `cargando` y `error` como
  Signals de solo lectura. Las peticiones usan `HttpClient` + `firstValueFrom` (cada petición emite un solo
  valor), así que no se necesitan suscripciones, `async` pipe ni operadores de RxJS.
- **Formularios reactivos tipados** (`NonNullableFormBuilder`). Los errores de validación del backend
  (`ValidationProblemDetails`) se muestran junto al campo correspondiente.
- **Lazy loading por ruta**: el bundle inicial solo contiene el shell; cada plantilla se descarga al visitarla.
- **Accesibilidad**: enlace "Saltar al contenido", `aria-current` en la navegación, etiquetas en botones de
  icono, `role="alert"`/`role="status"` en mensajes y respeto de `prefers-reduced-motion`.
- **Tema**: Material 3 (`mat.theme`) ajustado con los tokens institucionales (`--jv-azul`, `--jv-amarillo`, `--jv-rojo`).

## Personalización pendiente

- **Escudo oficial**: copie la imagen en `public/img/escudo.png` y ponga `usarImagen = true` en
  `src/app/shared/escudo/escudo.component.ts`.
- **Fotos propias**: `public/img/portada.jpg` y `public/img/sede.jpg`, y defina en `styles.scss`
  `--jv-foto-portada: url('/img/portada.jpg')` y `--jv-foto-sede: url('/img/sede.jpg')`.
  (Las imágenes del documento de plantillas provienen de YouTube e iStock y no deben publicarse sin licencia).
- **Documentos**: `public/docs/pei.pdf` y `public/docs/requisitos-admision.pdf`.
- **Redes sociales**: URLs en `src/app/core/institucion.ts`.
- **Seguridad**: proteger `/admin/noticias` con un guard de autenticación y el Campus Virtual con el
  proveedor de identidad que se elija (el backend todavía no tiene autenticación).

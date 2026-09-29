import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsCo from '@angular/common/locales/es-CO';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideNativeDateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { claveAdminInterceptor } from './core/http/clave-admin.interceptor';
import { TituloPaginaStrategy } from './core/titulo-pagina.strategy';

// Formatos de fecha y número en español de Colombia (p. ej. "21 de septiembre de 2026").
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // ---- Router: rutas perezosas, inputs desde la URL y scroll al inicio en cada navegación ----
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    { provide: TitleStrategy, useClass: TituloPaginaStrategy },

    // ---- HttpClient sobre la API Fetch nativa del navegador + clave del panel administrativo ----
    provideHttpClient(withFetch(), withInterceptors([claveAdminInterceptor])),

    // ---- Angular Material: animaciones cargadas de forma diferida + opciones globales ----
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 5000, horizontalPosition: 'center' } },

    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};

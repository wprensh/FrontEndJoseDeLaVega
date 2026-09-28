import { Routes } from '@angular/router';

/**
 * Cada sección se carga de forma perezosa (lazy loading) con `loadComponent`:
 * el navegador solo descarga el código de la plantilla que el usuario visita.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Inicio',
    loadComponent: () => import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  {
    path: 'nosotros',
    title: 'Nosotros',
    loadComponent: () => import('./features/nosotros/nosotros.component').then((m) => m.NosotrosComponent),
  },
  {
    path: 'academico',
    title: 'Académico',
    loadComponent: () => import('./features/academico/academico.component').then((m) => m.AcademicoComponent),
  },
  {
    path: 'admisiones',
    title: 'Admisiones',
    loadComponent: () => import('./features/admisiones/admisiones.component').then((m) => m.AdmisionesComponent),
  },
  {
    path: 'servicios',
    title: 'Servicios',
    loadComponent: () => import('./features/servicios/servicios.component').then((m) => m.ServiciosComponent),
  },
  {
    path: 'contacto',
    title: 'Contacto',
    loadComponent: () => import('./features/contacto/contacto.component').then((m) => m.ContactoComponent),
  },
  {
    path: 'campus',
    title: 'Campus Virtual',
    loadComponent: () => import('./features/campus/campus.component').then((m) => m.CampusComponent),
  },
  {
    // Panel administrativo del CRUD de noticias.
    // IMPORTANTE: protegerlo con un guard de autenticación cuando exista el inicio de sesión.
    path: 'admin/noticias',
    title: 'Administrar noticias',
    loadComponent: () =>
      import('./features/admin/noticias-admin/noticias-admin.component').then((m) => m.NoticiasAdminComponent),
  },
  { path: '**', redirectTo: 'inicio' },
];

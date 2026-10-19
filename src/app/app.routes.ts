import { Routes } from '@angular/router';

import { requierePermiso, requiereSesion } from './core/guards/permiso.guard';

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
  // ---- Panel administrativo: inicio de sesión y un módulo por ruta, según los permisos del usuario ----
  {
    path: 'admin/login',
    title: 'Iniciar sesión',
    loadComponent: () => import('./features/admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    pathMatch: 'full',
    title: 'Panel administrativo',
    canActivate: [requiereSesion],
    loadComponent: () => import('./features/admin/panel/panel.component').then((m) => m.PanelComponent),
  },
  {
    path: 'admin/noticias',
    title: 'Administrar noticias',
    canActivate: [requierePermiso('Noticias')],
    loadComponent: () =>
      import('./features/admin/noticias-admin/noticias-admin.component').then((m) => m.NoticiasAdminComponent),
  },
  {
    path: 'admin/certificados',
    title: 'Certificaciones',
    canActivate: [requierePermiso('Certificados')],
    loadComponent: () =>
      import('./features/admin/certificados-admin/certificados-admin.component').then(
        (m) => m.CertificadosAdminComponent,
      ),
  },
  {
    path: 'admin/usuarios',
    title: 'Usuarios',
    canActivate: [requierePermiso('Usuarios')],
    loadComponent: () =>
      import('./features/admin/usuarios-admin/usuarios-admin.component').then((m) => m.UsuariosAdminComponent),
  },
  {
    // Verificación pública; el QR de cada certificado apunta a /verificar/{codigo}.
    path: 'verificar/:codigo',
    title: 'Verificar certificado',
    loadComponent: () => import('./features/verificar/verificar.component').then((m) => m.VerificarComponent),
  },
  {
    path: 'verificar',
    title: 'Verificar certificado',
    loadComponent: () => import('./features/verificar/verificar.component').then((m) => m.VerificarComponent),
  },
  { path: '**', redirectTo: 'inicio' },
];

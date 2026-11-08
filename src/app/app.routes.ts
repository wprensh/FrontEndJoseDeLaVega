import { Routes } from '@angular/router';

import { requierePermiso, requiereSesion, requiereSesionCampus } from './core/guards/permiso.guard';

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
    path: 'campus/elecciones/:id',
    title: 'Tarjetón electoral',
    canActivate: [requiereSesionCampus],
    loadComponent: () => import('./features/campus/tarjeton.component').then((m) => m.TarjetonComponent),
  },
  {
    path: 'campus/elecciones/:id/resultados',
    title: 'Resultados de la elección',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/resultados-campus.component').then((m) => m.ResultadosCampusComponent),
  },
  // ---- Plataforma académica del campus (estudiantes, acudientes y docentes) ----
  {
    path: 'campus/boletines',
    title: 'Boletines',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/boletines-campus.component').then((m) => m.BoletinesCampusComponent),
  },
  {
    path: 'campus/asistencia',
    title: 'Asistencia',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/asistencia-campus.component').then((m) => m.AsistenciaCampusComponent),
  },
  {
    path: 'campus/observador',
    title: 'Observador del estudiante',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/observador-campus.component').then((m) => m.ObservadorCampusComponent),
  },
  {
    path: 'campus/circulares',
    title: 'Circulares',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/circulares-campus.component').then((m) => m.CircularesCampusComponent),
  },
  {
    path: 'campus/calendario',
    title: 'Calendario escolar',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/calendario-campus.component').then((m) => m.CalendarioCampusComponent),
  },
  {
    path: 'campus/carnet',
    title: 'Carné digital',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/academico/carnet-campus.component').then((m) => m.CarnetCampusComponent),
  },
  {
    path: 'campus/simulacros',
    title: 'Simulacros Saber',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/simulacros/simulacros-campus.component').then((m) => m.SimulacrosCampusComponent),
  },
  {
    path: 'campus/simulacros/:id/presentar',
    title: 'Presentar simulacro',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/simulacros/presentar-simulacro.component').then((m) => m.PresentarSimulacroComponent),
  },
  {
    path: 'campus/simulacros/:id/resultado',
    title: 'Resultado del simulacro',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/simulacros/resultado-simulacro.component').then((m) => m.ResultadoSimulacroComponent),
  },
  {
    path: 'campus/simulacros/:id/resultados',
    title: 'Resultados del simulacro',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/simulacros/resultados-docente.component').then((m) => m.ResultadosDocenteComponent),
  },
  {
    path: 'campus/docente',
    title: 'Mis clases',
    canActivate: [requiereSesionCampus],
    loadComponent: () => import('./features/campus/docente/mis-clases.component').then((m) => m.MisClasesComponent),
  },
  {
    path: 'campus/docente/:asignacionId',
    title: 'Clase',
    canActivate: [requiereSesionCampus],
    loadComponent: () =>
      import('./features/campus/docente/clase-docente.component').then((m) => m.ClaseDocenteComponent),
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
    path: 'admin/elecciones',
    title: 'Elecciones escolares',
    canActivate: [requierePermiso('Elecciones')],
    loadComponent: () =>
      import('./features/admin/elecciones-admin/elecciones-admin.component').then((m) => m.EleccionesAdminComponent),
  },
  {
    path: 'admin/elecciones/:id',
    title: 'Elección',
    canActivate: [requierePermiso('Elecciones')],
    loadComponent: () =>
      import('./features/admin/elecciones-admin/eleccion-detalle.component').then((m) => m.EleccionDetalleComponent),
  },
  {
    path: 'admin/comunidad',
    title: 'Estudiantes y docentes',
    canActivate: [requierePermiso('Campus')],
    loadComponent: () =>
      import('./features/admin/comunidad-admin/comunidad-admin.component').then((m) => m.ComunidadAdminComponent),
  },
  {
    path: 'admin/indicadores',
    title: 'Tablero del rector',
    canActivate: [requierePermiso('Indicadores')],
    loadComponent: () =>
      import('./features/admin/indicadores-admin/indicadores-admin.component').then((m) => m.IndicadoresAdminComponent),
  },
  {
    path: 'admin/academico',
    title: 'Gestión académica',
    canActivate: [requierePermiso('Academico')],
    loadComponent: () =>
      import('./features/admin/academico-admin/academico-admin.component').then((m) => m.AcademicoAdminComponent),
  },
  {
    path: 'admin/convivencia',
    title: 'Convivencia escolar',
    canActivate: [requierePermiso('Convivencia')],
    loadComponent: () =>
      import('./features/admin/convivencia-admin/convivencia-admin.component').then((m) => m.ConvivenciaAdminComponent),
  },
  {
    path: 'admin/simulacros',
    title: 'Simulacros Saber',
    canActivate: [requierePermiso('Simulacros')],
    loadComponent: () =>
      import('./features/admin/simulacros-admin/simulacros-admin.component').then((m) => m.SimulacrosAdminComponent),
  },
  {
    path: 'admin/simulacros/:id',
    title: 'Simulacro',
    canActivate: [requierePermiso('Simulacros')],
    loadComponent: () =>
      import('./features/admin/simulacros-admin/simulacro-detalle.component').then((m) => m.SimulacroDetalleComponent),
  },
  {
    path: 'admin/comunicaciones',
    title: 'Circulares y calendario',
    canActivate: [requierePermiso('Comunicaciones')],
    loadComponent: () =>
      import('./features/admin/comunicaciones-admin/comunicaciones-admin.component').then(
        (m) => m.ComunicacionesAdminComponent,
      ),
  },
  {
    path: 'admin/admisiones',
    title: 'Admisiones',
    canActivate: [requierePermiso('Admisiones')],
    loadComponent: () =>
      import('./features/admin/admisiones-admin/admisiones-admin.component').then((m) => m.AdmisionesAdminComponent),
  },
  {
    // Verificación pública del carné; el QR de cada carné apunta a /carnet/{codigo}.
    path: 'carnet/:codigo',
    title: 'Verificar carné',
    loadComponent: () => import('./features/carnet/verificar-carnet.component').then((m) => m.VerificarCarnetComponent),
  },
  {
    path: 'carnet',
    title: 'Verificar carné',
    loadComponent: () => import('./features/carnet/verificar-carnet.component').then((m) => m.VerificarCarnetComponent),
  },
  {
    path: 'calendario',
    title: 'Calendario escolar',
    loadComponent: () => import('./features/calendario/calendario.component').then((m) => m.CalendarioComponent),
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

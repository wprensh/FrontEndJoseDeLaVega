/** Módulos del panel administrativo (mismos nombres que el enum ModuloSistema de la API). */
export type Modulo =
  | 'Noticias'
  | 'Certificados'
  | 'Pqrs'
  | 'Usuarios'
  | 'Elecciones'
  | 'Campus'
  | 'Academico'
  | 'Convivencia'
  | 'Simulacros'
  | 'Admisiones'
  | 'Comunicaciones'
  | 'Indicadores';

/** Nivel de acción sobre los registros de un módulo. */
export type Accion = 'Ver' | 'Crear' | 'Editar' | 'Eliminar';

/** Permiso como lo envía la API: "Modulo:Accion", p. ej. "Noticias:Editar". */
export type Permiso = `${Modulo}:${Accion}`;

export interface InfoModulo {
  readonly modulo: Modulo;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly icono: string;
  /** Ruta del panel; null si el módulo aún no tiene pantalla en el sitio. */
  readonly ruta: string | null;
  /** Texto de cada acción en este módulo (p. ej. en certificados "Eliminar" es anular). */
  readonly acciones: Readonly<Record<Accion, string>>;
}

const ACCIONES_GENERICAS = { Ver: 'Ver', Crear: 'Crear', Editar: 'Editar', Eliminar: 'Eliminar' } as const;

/**
 * Catálogo de módulos del panel. Para un módulo nuevo: agregarlo aquí y en ModuloSistema de la API,
 * y proteger su ruta con `requierePermiso('Modulo')`.
 */
export const MODULOS: readonly InfoModulo[] = [
  {
    modulo: 'Noticias',
    etiqueta: 'Noticias',
    descripcion: 'Noticias y eventos de la página de inicio.',
    icono: 'newspaper',
    ruta: '/admin/noticias',
    acciones: ACCIONES_GENERICAS,
  },
  {
    modulo: 'Certificados',
    etiqueta: 'Certificaciones',
    descripcion: 'Certificados y constancias con membrete y código de verificación.',
    icono: 'workspace_premium',
    ruta: '/admin/certificados',
    acciones: { Ver: 'Ver', Crear: 'Expedir', Editar: 'Editar', Eliminar: 'Anular' },
  },
  {
    modulo: 'Pqrs',
    etiqueta: 'PQRS',
    descripcion: 'Peticiones, quejas, reclamos y sugerencias del formulario de contacto.',
    icono: 'forum',
    ruta: null,
    acciones: { Ver: 'Ver', Crear: 'Crear', Editar: 'Responder', Eliminar: 'Eliminar' },
  },
  {
    modulo: 'Usuarios',
    etiqueta: 'Usuarios',
    descripcion: 'Personas con acceso al panel y sus permisos.',
    icono: 'manage_accounts',
    ruta: '/admin/usuarios',
    acciones: ACCIONES_GENERICAS,
  },
  {
    modulo: 'Elecciones',
    etiqueta: 'Elecciones',
    descripcion: 'Gobierno escolar: jornadas de votación, candidatos con su perfil y resultados.',
    icono: 'how_to_vote',
    ruta: '/admin/elecciones',
    acciones: ACCIONES_GENERICAS,
  },
  {
    modulo: 'Campus',
    etiqueta: 'Comunidad del campus',
    descripcion: 'Estudiantes, docentes y acudientes del campus virtual, sus claves de acceso y carnés.',
    icono: 'school',
    ruta: '/admin/comunidad',
    acciones: { Ver: 'Ver', Crear: 'Registrar', Editar: 'Editar y generar claves', Eliminar: 'Eliminar' },
  },
  {
    modulo: 'Indicadores',
    etiqueta: 'Tablero del rector',
    descripcion: 'Asistencia del día, rendimiento por grado y área, convivencia, simulacros y admisiones.',
    icono: 'monitoring',
    ruta: '/admin/indicadores',
    acciones: ACCIONES_GENERICAS,
  },
  {
    modulo: 'Academico',
    etiqueta: 'Académico',
    descripcion: 'Periodos, asignaturas, carga docente, consolidado de notas, boletines y reporte de asistencia.',
    icono: 'menu_book',
    ruta: '/admin/academico',
    acciones: { Ver: 'Ver', Crear: 'Crear', Editar: 'Editar y publicar boletines', Eliminar: 'Eliminar' },
  },
  {
    modulo: 'Convivencia',
    etiqueta: 'Convivencia',
    descripcion: 'Observador del estudiante y situaciones tipo I, II y III (Ley 1620) con seguimiento.',
    icono: 'diversity_3',
    ruta: '/admin/convivencia',
    acciones: { Ver: 'Ver', Crear: 'Registrar', Editar: 'Hacer seguimiento', Eliminar: 'Eliminar' },
  },
  {
    modulo: 'Simulacros',
    etiqueta: 'Simulacros Saber',
    descripcion: 'Pruebas tipo Saber 11 y 3°, 5° y 9° en el campus, con resultados por área y pregunta.',
    icono: 'quiz',
    ruta: '/admin/simulacros',
    acciones: ACCIONES_GENERICAS,
  },
  {
    modulo: 'Comunicaciones',
    etiqueta: 'Circulares y calendario',
    descripcion: 'Circulares con confirmación de lectura y eventos del calendario escolar.',
    icono: 'campaign',
    ruta: '/admin/comunicaciones',
    acciones: { Ver: 'Ver', Crear: 'Redactar', Editar: 'Editar y publicar', Eliminar: 'Eliminar' },
  },
  {
    modulo: 'Admisiones',
    etiqueta: 'Admisiones',
    descripcion: 'Solicitudes de pre-matrícula en línea, documentos y matrícula al campus.',
    icono: 'how_to_reg',
    ruta: '/admin/admisiones',
    acciones: { Ver: 'Ver', Crear: 'Crear', Editar: 'Revisar y matricular', Eliminar: 'Eliminar' },
  },
];

export const ACCIONES: readonly Accion[] = ['Ver', 'Crear', 'Editar', 'Eliminar'];

export function infoModulo(modulo: Modulo): InfoModulo {
  return MODULOS.find((m) => m.modulo === modulo)!;
}

/** Usuario de la sesión con sus permisos efectivos. */
export interface Perfil {
  readonly id: string;
  readonly nombreUsuario: string;
  readonly nombreCompleto: string;
  readonly correo: string | null;
  readonly esSuperAdministrador: boolean;
  readonly permisos: readonly Permiso[];
}

/** Respuesta de iniciar sesión, configuración inicial y cambio de contraseña. */
export interface Sesion {
  readonly token: string;
  /** Fecha ISO en que vence el token. */
  readonly expira: string;
  readonly usuario: Perfil;
}

export interface EstadoAutenticacion {
  readonly requiereConfiguracion: boolean;
}

/** Usuario tal como lo devuelve el módulo de usuarios. */
export interface Usuario {
  readonly id: string;
  readonly nombreUsuario: string;
  readonly nombreCompleto: string;
  readonly correo: string | null;
  readonly esSuperAdministrador: boolean;
  readonly activo: boolean;
  readonly bloqueado: boolean;
  readonly permisos: readonly Permiso[];
  readonly ultimoAcceso: string | null;
  readonly creadoEn: string;
}

export interface CrearUsuario {
  nombreUsuario: string;
  nombreCompleto: string;
  correo: string | null;
  clave: string;
  esSuperAdministrador: boolean;
  permisos: Permiso[];
}

export interface ActualizarUsuario {
  nombreCompleto: string;
  correo: string | null;
  esSuperAdministrador: boolean;
  activo: boolean;
  permisos: Permiso[];
}

export interface ConfiguracionInicial {
  nombreUsuario: string;
  nombreCompleto: string;
  correo: string | null;
  clave: string;
}

/** Reglas de contraseña de la API: al menos 8 caracteres, con letras y números. */
export const PATRON_CLAVE = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;
export const PATRON_NOMBRE_USUARIO = /^[A-Za-z0-9._-]{3,50}$/;

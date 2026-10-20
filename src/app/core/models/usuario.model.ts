/** Módulos del panel administrativo (mismos nombres que el enum ModuloSistema de la API). */
export type Modulo = 'Noticias' | 'Certificados' | 'Pqrs' | 'Usuarios' | 'Elecciones' | 'Campus';

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
    etiqueta: 'Estudiantes y docentes',
    descripcion: 'Quiénes entran al campus virtual y sus claves de acceso.',
    icono: 'school',
    ruta: '/admin/comunidad',
    acciones: { Ver: 'Ver', Crear: 'Registrar', Editar: 'Editar y generar claves', Eliminar: 'Eliminar' },
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

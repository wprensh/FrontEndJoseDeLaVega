/** Página de resultados que devuelve la API (PagedResult&lt;T&gt; en .NET). */
export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly pagina: number;
  readonly tamanoPagina: number;
  readonly total: number;
  readonly totalPaginas: number;
}

/** Error estándar RFC 9457 que devuelve la API (ProblemDetails / ValidationProblemDetails). */
export interface ProblemDetails {
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
  readonly errors?: Readonly<Record<string, readonly string[]>>;
}

export const paginaVacia = <T>(): PagedResult<T> => ({
  items: [],
  pagina: 1,
  tamanoPagina: 10,
  total: 0,
  totalPaginas: 0,
});

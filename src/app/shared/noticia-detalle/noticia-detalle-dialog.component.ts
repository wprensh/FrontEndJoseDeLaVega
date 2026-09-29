import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { EstiloCategoria, Noticia, estiloDeCategoria } from '../../core/models/noticia.model';
import { desdeFechaIso } from '../../core/utils/fechas';
import { resolverUrlRecurso } from '../../core/utils/url-recurso';
import { analizarYoutube, urlReproductorYoutube } from '../../core/utils/youtube';

/** Parámetros del modal. Solo `noticia` es obligatoria; el resto permite personalizarlo. */
export interface NoticiaDetalleData {
  readonly noticia: Noticia;
  /** Sobrescribe el estilo de la categoría (etiqueta, icono o colores). */
  readonly estilo?: Partial<EstiloCategoria>;
  /** Texto del botón de cierre. Por defecto "Cerrar". */
  readonly textoCerrar?: string;
  /** Oculta la imagen aunque la noticia tenga una. */
  readonly ocultarImagen?: boolean;
  /** Si la noticia tiene video de YouTube, empieza a reproducirse al abrir el modal. Por defecto true. */
  readonly reproducirAutomaticamente?: boolean;
}

/**
 * Modal standalone con el detalle de una noticia de cualquier categoría.
 *
 * Uso:
 *   NoticiaDetalleDialogComponent.abrir(dialog, noticia);
 *   NoticiaDetalleDialogComponent.abrir(dialog, noticia, { estilo: { icono: 'campaign' } });
 */
@Component({
  selector: 'app-noticia-detalle-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  host: {
    '[style.--color-categoria]': 'estilo().color',
    '[style.--fondo-categoria]': 'estilo().fondo',
  },
  templateUrl: './noticia-detalle-dialog.component.html',
  styleUrl: './noticia-detalle-dialog.component.scss',
})
export class NoticiaDetalleDialogComponent {
  protected readonly data = inject<NoticiaDetalleData>(MAT_DIALOG_DATA);
  readonly #dialogRef = inject(MatDialogRef<NoticiaDetalleDialogComponent>);

  protected readonly noticia = this.data.noticia;

  /** Estilo de la categoría combinado con las personalizaciones recibidas. */
  protected readonly estilo = computed<EstiloCategoria>(() => ({
    ...estiloDeCategoria(this.noticia.categoria),
    ...this.data.estilo,
  }));

  protected readonly fecha = desdeFechaIso(this.noticia.fechaPublicacion);

  /**
   * Estado de la imagen:
   * - 'cargando': se muestra un marcador del mismo tamaño para que el texto no salte.
   * - 'cargada':  se muestra la imagen.
   * - 'error':    la URL no es una imagen (p. ej. un enlace de OneDrive o Drive) y se oculta todo.
   */
  protected readonly estadoImagen = signal<'cargando' | 'cargada' | 'error'>('cargando');

  /**
   * Si el enlace es un video de YouTube se muestra el reproductor en lugar de una imagen.
   * La URL del reproductor se arma con un id validado (11 caracteres), por eso es seguro marcarla como confiable.
   */
  protected readonly video = this.data.ocultarImagen ? null : analizarYoutube(this.noticia.imagenUrl);
  protected readonly urlVideo: SafeResourceUrl | null = this.video
    ? inject(DomSanitizer).bypassSecurityTrustResourceUrl(
        urlReproductorYoutube(this.video, { autoplay: this.data.reproducirAutomaticamente ?? true }),
      )
    : null;

  /** Solo se intenta mostrar imagen si la noticia la tiene, no es un video y no se pidió ocultarla. */
  protected readonly tieneImagen = !!this.noticia.imagenUrl?.trim() && !this.video && !this.data.ocultarImagen;
  /** Rutas del sitio ("/img/...") se resuelven contra la base de la app (necesario en GitHub Pages). */
  protected readonly urlImagen = this.tieneImagen ? resolverUrlRecurso(this.noticia.imagenUrl!.trim()) : '';
  protected readonly mostrarImagen = computed(() => this.tieneImagen && this.estadoImagen() !== 'error');

  /** El contenido completo; si la noticia no lo tiene, se muestra el resumen. */
  protected readonly parrafos = (this.noticia.contenido?.trim() || this.noticia.resumen)
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  protected cerrar(): void {
    this.#dialogRef.close();
  }

  /** Abre el modal con la configuración recomendada (ancho adaptable y foco inicial en el título). */
  static abrir(
    dialog: MatDialog,
    noticia: Noticia,
    opciones: Omit<NoticiaDetalleData, 'noticia'> = {},
  ): MatDialogRef<NoticiaDetalleDialogComponent, void> {
    return dialog.open<NoticiaDetalleDialogComponent, NoticiaDetalleData, void>(NoticiaDetalleDialogComponent, {
      data: { noticia, ...opciones },
      width: '680px',
      maxWidth: 'calc(100vw - 2rem)',
      maxHeight: 'calc(100dvh - 2rem)',
      autoFocus: 'dialog',
      ariaLabelledBy: `noticia-${noticia.id}-titulo`,
    });
  }
}

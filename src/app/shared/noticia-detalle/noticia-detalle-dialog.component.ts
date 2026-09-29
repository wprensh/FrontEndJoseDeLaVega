import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { EstiloCategoria, Noticia, estiloDeCategoria } from '../../core/models/noticia.model';
import { desdeFechaIso } from '../../core/utils/fechas';

/** Parámetros del modal. Solo `noticia` es obligatoria; el resto permite personalizarlo. */
export interface NoticiaDetalleData {
  readonly noticia: Noticia;
  /** Sobrescribe el estilo de la categoría (etiqueta, icono o colores). */
  readonly estilo?: Partial<EstiloCategoria>;
  /** Texto del botón de cierre. Por defecto "Cerrar". */
  readonly textoCerrar?: string;
  /** Oculta la imagen aunque la noticia tenga una. */
  readonly ocultarImagen?: boolean;
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

  /** Si la imagen no carga (URL rota), se oculta en lugar de mostrar un icono roto. */
  protected readonly imagenFallida = signal(false);
  protected readonly mostrarImagen = computed(
    () => !!this.noticia.imagenUrl && !this.data.ocultarImagen && !this.imagenFallida(),
  );

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

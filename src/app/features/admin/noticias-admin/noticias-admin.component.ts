import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { CATEGORIAS_NOTICIA, CategoriaNoticia, GuardarNoticia, Noticia } from '../../../core/models/noticia.model';
import { paginadorEnEspanol } from '../../../core/paginador-intl';
import { NoticiasService } from '../../../core/services/noticias.service';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/** Acepta URLs http(s) absolutas; el backend aplica la misma regla. */
const PATRON_URL = /^https?:\/\/\S+$/i;

/**
 * Panel administrativo de noticias (CRUD completo).
 *
 * - Tabla de Angular Material alimentada por los Signals de `NoticiasService`.
 * - Formulario reactivo tipado para crear y editar.
 * - Estado de la vista (edición, guardado, filtros) modelado con Signals.
 */
@Component({
  selector: 'app-noticias-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeadingComponent,
  ],
  // Textos del paginador en español (se provee aquí para no cargar el paginador en el bundle inicial).
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './noticias-admin.component.html',
  styleUrl: './noticias-admin.component.scss',
})
export class NoticiasAdminComponent implements OnInit {
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly servicio = inject(NoticiasService);

  protected readonly categorias = CATEGORIAS_NOTICIA;
  protected readonly columnas = ['titulo', 'categoria', 'fechaPublicacion', 'publicada', 'acciones'] as const;
  protected readonly aFecha = desdeFechaIso;
  /** trackBy de la tabla: conserva las filas existentes al recargar o editar. */
  protected readonly porId = (_: number, noticia: Noticia): string => noticia.id;

  // ---- Estado de la vista ----
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(10);
  protected readonly editando = signal<Noticia | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);

  protected readonly tituloFormulario = computed(() =>
    this.editando() ? `Editar: ${this.editando()!.titulo}` : 'Nueva noticia',
  );

  // ---- Formulario reactivo tipado ----
  protected readonly formulario = this.#fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(150)]],
    resumen: ['', [Validators.required, Validators.maxLength(300)]],
    contenido: ['', Validators.maxLength(8000)],
    categoria: ['Institucional' as CategoriaNoticia, Validators.required],
    fechaPublicacion: [new Date(), Validators.required],
    imagenUrl: ['', [Validators.maxLength(500), Validators.pattern(PATRON_URL)]],
    publicada: [true],
  });

  ngOnInit(): void {
    void this.recargar();
  }

  // ---------------- Listado ----------------

  protected recargar(): Promise<void> {
    return this.servicio.cargar({
      buscar: this.busqueda().trim() || undefined,
      pagina: this.pagina(),
      tamanoPagina: this.tamanoPagina(),
    });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex + 1);
    this.tamanoPagina.set(evento.pageSize);
    void this.recargar();
  }

  // ---------------- Formulario ----------------

  protected editar(noticia: Noticia): void {
    this.editando.set(noticia);
    this.errorFormulario.set(null);
    this.formulario.reset({
      titulo: noticia.titulo,
      resumen: noticia.resumen,
      contenido: noticia.contenido,
      categoria: noticia.categoria,
      fechaPublicacion: desdeFechaIso(noticia.fechaPublicacion),
      imagenUrl: noticia.imagenUrl ?? '',
      publicada: noticia.publicada,
    });
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
    this.errorFormulario.set(null);
    this.formulario.reset();
  }

  protected async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue();
    const datos: GuardarNoticia = {
      titulo: valor.titulo.trim(),
      resumen: valor.resumen.trim(),
      contenido: valor.contenido.trim() || null,
      categoria: valor.categoria,
      fechaPublicacion: aFechaIso(valor.fechaPublicacion),
      imagenUrl: valor.imagenUrl.trim() || null,
      publicada: valor.publicada,
    };

    this.guardando.set(true);
    this.errorFormulario.set(null);

    try {
      const actual = this.editando();
      if (actual) {
        await this.servicio.actualizar(actual.id, datos);
        this.#snackBar.open('Noticia actualizada.', 'Cerrar');
      } else {
        await this.servicio.crear(datos);
        this.#snackBar.open('Noticia creada.', 'Cerrar');
        // La nueva noticia puede quedar en otra página según el orden: se recarga el listado.
        await this.recargar();
      }
      this.cancelarEdicion();
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.errorFormulario.set(mensajeDeError(error));
      }
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------------- Eliminar ----------------

  protected async eliminar(noticia: Noticia): Promise<void> {
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Eliminar noticia',
            mensaje: `¿Desea eliminar "${noticia.titulo}"? Esta acción no se puede deshacer.`,
            confirmar: 'Eliminar',
          },
        })
        .afterClosed(),
    );

    if (!confirmado) {
      return;
    }

    try {
      await this.servicio.eliminar(noticia.id);
      if (this.editando()?.id === noticia.id) {
        this.cancelarEdicion();
      }
      this.#snackBar.open('Noticia eliminada.', 'Cerrar');
      // Si la página quedó vacía, retrocede una página.
      if (this.servicio.noticias().length === 0 && this.pagina() > 1) {
        this.pagina.update((p) => p - 1);
        await this.recargar();
      }
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected etiquetaCategoria(categoria: CategoriaNoticia): string {
    return this.categorias.find((c) => c.valor === categoria)?.etiqueta ?? categoria;
  }
}

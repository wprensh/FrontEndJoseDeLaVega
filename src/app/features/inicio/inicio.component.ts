import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { INSTITUCION } from '../../core/institucion';
import { Noticia } from '../../core/models/noticia.model';
import { NoticiasService } from '../../core/services/noticias.service';
import { desdeFechaIso } from '../../core/utils/fechas';
import { mensajeDeError } from '../../core/utils/http-error';
import { NoticiaDetalleDialogComponent } from '../../shared/noticia-detalle/noticia-detalle-dialog.component';

interface Valor {
  readonly nombre: string;
  readonly icono: string;
  readonly tono: 'rojo' | 'amarillo' | 'azul' | 'rosa';
}

/** Plantilla de inicio: portada, valores institucionales, noticias recientes y eventos. */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  readonly #noticiasService = inject(NoticiasService);
  readonly #dialog = inject(MatDialog);

  protected readonly institucion = INSTITUCION;

  protected readonly valores: readonly Valor[] = [
    { nombre: 'Honor', icono: 'military_tech', tono: 'rojo' },
    { nombre: 'Trabajo', icono: 'work', tono: 'amarillo' },
    { nombre: 'Respeto', icono: 'handshake', tono: 'azul' },
    { nombre: 'Solidaridad', icono: 'favorite', tono: 'rosa' },
  ];

  // Estado local del bloque de noticias (no comparte el estado del panel administrativo).
  protected readonly noticias = signal<readonly Noticia[]>([]);
  protected readonly eventos = signal<readonly Noticia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly aFecha = desdeFechaIso;

  ngOnInit(): void {
    void this.cargarNoticias();
  }

  protected async cargarNoticias(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    try {
      // Las dos consultas son independientes: se lanzan en paralelo.
      const [recientes, proximos] = await Promise.all([
        this.#noticiasService.buscar({ soloPublicadas: true, tamanoPagina: 4 }),
        this.#noticiasService.buscar({ soloPublicadas: true, categoria: 'Evento', tamanoPagina: 3 }),
      ]);
      this.noticias.set(recientes.items.filter((n) => n.categoria !== 'Evento').slice(0, 2));
      this.eventos.set(proximos.items);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Abre el detalle en el modal; el estilo se ajusta según la categoría de la noticia. */
  protected verNoticia(noticia: Noticia): void {
    NoticiaDetalleDialogComponent.abrir(this.#dialog, noticia);
  }
}

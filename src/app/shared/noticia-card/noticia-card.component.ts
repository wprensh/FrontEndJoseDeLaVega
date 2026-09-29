import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Noticia, estiloDeCategoria } from '../../core/models/noticia.model';
import { desdeFechaIso } from '../../core/utils/fechas';
import { resolverUrlRecurso } from '../../core/utils/url-recurso';
import { analizarYoutube, urlMiniaturaYoutube } from '../../core/utils/youtube';

/**
 * Tarjeta de una noticia: miniatura (imagen, portada del video de YouTube o ícono de la categoría),
 * etiqueta de categoría con su color, título, resumen, fecha y botón "Ver".
 */
@Component({
  selector: 'app-noticia-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule],
  host: {
    '[style.--color-categoria]': 'estilo().color',
    '[style.--fondo-categoria]': 'estilo().fondo',
  },
  templateUrl: './noticia-card.component.html',
  styleUrl: './noticia-card.component.scss',
})
export class NoticiaCardComponent {
  readonly noticia = input.required<Noticia>();
  /** Se emite al pulsar la miniatura o el botón "Ver". */
  readonly ver = output<Noticia>();

  protected readonly estilo = computed(() => estiloDeCategoria(this.noticia().categoria));
  protected readonly video = computed(() => analizarYoutube(this.noticia().imagenUrl));
  protected readonly fecha = computed(() => desdeFechaIso(this.noticia().fechaPublicacion));

  /** Portada del video, la imagen de la noticia, o null para mostrar el ícono de la categoría. */
  protected readonly miniatura = computed(() => {
    const video = this.video();
    if (video) {
      return urlMiniaturaYoutube(video);
    }
    const url = this.noticia().imagenUrl?.trim();
    return url ? resolverUrlRecurso(url) : null;
  });

  /** Si la miniatura no carga (enlace roto o que no es imagen), se muestra el ícono. */
  protected readonly miniaturaFallida = signal(false);
}

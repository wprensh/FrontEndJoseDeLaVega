import { DatePipe, Location } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { INSTITUCION } from '../../core/institucion';
import { PagedResult, paginaVacia } from '../../core/models/api.models';
import { ArchivoMes, Noticia } from '../../core/models/noticia.model';
import { paginadorEnEspanol } from '../../core/paginador-intl';
import { NoticiasService } from '../../core/services/noticias.service';
import { desdeFechaIso } from '../../core/utils/fechas';
import { mensajeDeError } from '../../core/utils/http-error';
import {
  FILTRO_FECHAS_INICIAL,
  FiltroFechasNoticias,
  describirPeriodo,
  filtroAParametrosUrl,
  filtroDesdeUrl,
  rangoDelFiltro,
} from '../../core/utils/periodo-noticias';
import { NoticiaCardComponent } from '../../shared/noticia-card/noticia-card.component';
import { NoticiaDetalleDialogComponent } from '../../shared/noticia-detalle/noticia-detalle-dialog.component';
import { FiltroFechasNoticiasComponent } from './filtro-fechas-noticias/filtro-fechas-noticias.component';

interface Valor {
  readonly nombre: string;
  readonly icono: string;
  readonly tono: 'rojo' | 'amarillo' | 'azul' | 'rosa';
}

/** Noticias por página en el inicio (dos filas de tres tarjetas en pantallas grandes). */
const NOTICIAS_POR_PAGINA = 6;

/** Plantilla de inicio: portada, valores institucionales, noticias recientes paginadas y filtrables por fecha, y eventos. */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    NoticiaCardComponent,
    FiltroFechasNoticiasComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  readonly #noticiasService = inject(NoticiasService);
  readonly #dialog = inject(MatDialog);
  readonly #location = inject(Location);
  readonly #locale = inject(LOCALE_ID);
  private readonly seccionNoticias = viewChild<ElementRef<HTMLElement>>('seccionNoticias');

  protected readonly institucion = INSTITUCION;
  protected readonly noticiasPorPagina = NOTICIAS_POR_PAGINA;
  /** Marcadores de carga: una tarjeta vacía por cada noticia esperada. */
  protected readonly marcadores = Array.from({ length: NOTICIAS_POR_PAGINA }, (_, i) => i);

  protected readonly valores: readonly Valor[] = [
    { nombre: 'Honor', icono: 'military_tech', tono: 'rojo' },
    { nombre: 'Trabajo', icono: 'work', tono: 'amarillo' },
    { nombre: 'Respeto', icono: 'handshake', tono: 'azul' },
    { nombre: 'Solidaridad', icono: 'favorite', tono: 'rosa' },
  ];

  // ---- Noticias recientes (paginadas en la API, las más nuevas primero) ----
  protected readonly paginaNoticias = signal<PagedResult<Noticia>>(paginaVacia<Noticia>());
  protected readonly noticias = computed(() => this.paginaNoticias().items);
  protected readonly cargandoNoticias = signal(true);
  protected readonly primeraCarga = signal(true);
  protected readonly errorNoticias = signal<string | null>(null);
  #ultimaSolicitud = 0;

  // ---- Filtro por fechas (se conserva en la URL para poder compartir el enlace) ----
  protected readonly filtro = signal<FiltroFechasNoticias>(filtroDesdeUrl(inject(ActivatedRoute).snapshot.queryParamMap));
  protected readonly archivo = signal<readonly ArchivoMes[]>([]);
  protected readonly hayFiltroDeFechas = computed(() => {
    const { periodo, desde, hasta } = this.filtro();
    return periodo !== 'todas' && (periodo !== 'personalizado' || desde !== null || hasta !== null);
  });
  protected readonly descripcionPeriodo = computed(() => describirPeriodo(this.filtro(), this.#locale));

  // ---- Eventos próximos ----
  protected readonly eventos = signal<readonly Noticia[]>([]);
  protected readonly cargandoEventos = signal(true);

  protected readonly aFecha = desdeFechaIso;

  ngOnInit(): void {
    void this.cargarNoticias(1);
    void this.cargarEventos();
    void this.cargarArchivo();
  }

  protected async cargarNoticias(pagina: number): Promise<void> {
    const solicitud = ++this.#ultimaSolicitud;
    this.cargandoNoticias.set(true);
    this.errorNoticias.set(null);

    try {
      const { desde, hasta } = rangoDelFiltro(this.filtro());
      const resultado = await this.#noticiasService.buscar({
        soloPublicadas: true,
        desde: desde ?? undefined,
        hasta: hasta ?? undefined,
        orden: this.filtro().orden,
        pagina,
        tamanoPagina: NOTICIAS_POR_PAGINA,
      });
      // Si el usuario cambió de página otra vez mientras tanto, se ignora esta respuesta antigua.
      if (solicitud === this.#ultimaSolicitud) {
        this.paginaNoticias.set(resultado);
      }
    } catch (error) {
      if (solicitud === this.#ultimaSolicitud) {
        this.errorNoticias.set(mensajeDeError(error));
      }
    } finally {
      if (solicitud === this.#ultimaSolicitud) {
        this.cargandoNoticias.set(false);
        this.primeraCarga.set(false);
      }
    }
  }

  protected cambiarPagina(evento: PageEvent): void {
    void this.cargarNoticias(evento.pageIndex + 1);
    // Lleva la vista al inicio de la sección para que el lector vea la nueva página desde arriba.
    this.seccionNoticias()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Aplica un nuevo filtro: vuelve a la primera página y actualiza la URL sin navegar (no mueve el scroll). */
  protected cambiarFiltro(filtro: FiltroFechasNoticias): void {
    this.filtro.set(filtro);
    const consulta = new HttpParams({ fromObject: filtroAParametrosUrl(filtro) }).toString();
    this.#location.replaceState(this.#location.path().split('?')[0], consulta);
    void this.cargarNoticias(1);
  }

  protected quitarFiltro(): void {
    this.cambiarFiltro({ ...FILTRO_FECHAS_INICIAL, orden: this.filtro().orden });
  }

  protected async cargarArchivo(): Promise<void> {
    try {
      this.archivo.set(await this.#noticiasService.archivo());
    } catch {
      // Sin archivo el filtro sigue funcionando con los atajos y el rango personalizado.
      this.archivo.set([]);
    }
  }

  protected async cargarEventos(): Promise<void> {
    try {
      const resultado = await this.#noticiasService.buscar({ soloPublicadas: true, categoria: 'Evento', tamanoPagina: 3 });
      this.eventos.set(resultado.items);
    } catch {
      // Si falla, el bloque de eventos muestra su mensaje vacío; el error ya se informa en las noticias.
      this.eventos.set([]);
    } finally {
      this.cargandoEventos.set(false);
    }
  }

  /** Abre el detalle en el modal; el estilo se ajusta según la categoría de la noticia. */
  protected verNoticia(noticia: Noticia): void {
    NoticiaDetalleDialogComponent.abrir(this.#dialog, noticia);
  }
}

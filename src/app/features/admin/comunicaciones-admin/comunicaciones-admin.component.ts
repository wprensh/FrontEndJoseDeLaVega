import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { hoyColombia } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import { Circular, Evento, PUBLICOS_CIRCULAR, TIPOS_EVENTO } from '../../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../../core/services/comunicaciones.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { fechaLocal } from '../../../shared/calendario/calendario-eventos.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { CircularDialogComponent } from './circular-dialog.component';
import { EventoDialogComponent } from './evento-dialog.component';
import { PendientesDialogComponent } from './pendientes-dialog.component';

/** Suma meses a una fecha AAAA-MM-DD y devuelve el primer día de ese mes. */
function primeroDelMes(fecha: string, meses: number): string {
  const [a, m] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + meses, 1));
  return d.toISOString().slice(0, 10);
}

/** Qué parte muestra la ruta: /admin/circulares o /admin/calendario (dato de la ruta). */
export type SeccionComunicaciones = 'circulares' | 'calendario';

/** Circulares con confirmación de lectura, o calendario escolar: cada uno es un módulo del panel. */
@Component({
  selector: 'app-comunicaciones-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    BarraAdminComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        [titulo]="seccion() === 'circulares' ? 'Circulares' : 'Calendario escolar'"
        [subtitulo]="
          seccion() === 'circulares'
            ? 'Comunicados para familias y docentes con confirmación de lectura'
            : 'Agenda institucional, fechas académicas y festivos'
        "
        etiqueta="Panel administrativo"
      />
      <app-barra-admin />

      @if (seccion() === 'circulares') {
          <section class="tarjeta">
            <div class="barra">
              <p class="ayuda">
                Al publicar, la circular aparece en el campus de los destinatarios y se envía por correo a quienes lo tengan
                registrado. Aquí ve quién la leyó y puede recordarle por WhatsApp a quien falte.
              </p>
              @if (sesion.puede('Circulares', 'Crear')) {
                <button mat-flat-button class="boton-azul" type="button" (click)="editarCircular(null)">
                  <mat-icon aria-hidden="true">add</mat-icon>
                  Nueva circular
                </button>
              }
            </div>
            @if (cargandoCirculares()) {
              <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
            }
            @if (error(); as e) {
              <p class="aviso-error" role="alert">{{ e }}</p>
            }
            <div class="desplazable">
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Circular</th>
                    <th scope="col">Dirigida a</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Lectura</th>
                    <th scope="col"><span class="visualmente-oculto">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of circulares(); track c.id) {
                    <tr>
                      <th scope="row">
                        <span class="codigo">{{ c.codigo }}</span>
                        {{ c.titulo }}
                        @if (c.enlaceAdjunto) {
                          <mat-icon class="clip" aria-label="Con documento adjunto">attach_file</mat-icon>
                        }
                      </th>
                      <td>{{ publicos[c.publico] }}<span class="detalle">{{ gradosDe(c) }}</span></td>
                      <td>
                        @if (c.publicadaEn) {
                          <span class="estado publicada">Publicada</span>
                          <span class="detalle">{{ c.publicadaEn | date: 'd MMM y, h:mm a' }}</span>
                        } @else {
                          <span class="estado">Borrador</span>
                        }
                      </td>
                      <td class="lectura">
                        @if (c.publicadaEn) {
                          <div class="medidor" [attr.aria-label]="c.leidas + ' de ' + c.destinatarios + ' la leyeron'">
                            <span [style.inline-size.%]="porcentaje(c.leidas, c.destinatarios)"></span>
                          </div>
                          <span class="detalle">
                            {{ c.leidas }}/{{ c.destinatarios }} leída ({{ porcentaje(c.leidas, c.destinatarios) | number: '1.0-0' }} %)
                            @if (c.requiereConfirmacion) {
                              · {{ c.confirmadas }} enterados
                            }
                          </span>
                        } @else {
                          <span class="detalle">{{ c.destinatarios }} destinatarios</span>
                        }
                      </td>
                      <td class="acciones">
                        @if (!c.publicadaEn && sesion.puede('Circulares', 'Editar')) {
                          <button mat-flat-button class="boton-institucional" type="button" (click)="publicar(c)">Publicar</button>
                        }
                        @if (c.publicadaEn) {
                          <button mat-icon-button type="button" matTooltip="Pendientes por leer" aria-label="Pendientes" (click)="verPendientes(c)">
                            <mat-icon>pending_actions</mat-icon>
                          </button>
                        }
                        @if (sesion.puede('Circulares', 'Editar')) {
                          <button mat-icon-button type="button" matTooltip="Editar" aria-label="Editar" (click)="editarCircular(c)">
                            <mat-icon>edit</mat-icon>
                          </button>
                        }
                        @if (sesion.puede('Circulares', 'Eliminar')) {
                          <button mat-icon-button type="button" matTooltip="Eliminar" aria-label="Eliminar" (click)="eliminarCircular(c)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    @if (!cargandoCirculares()) {
                      <tr><td colspan="5" class="vacio">Aún no hay circulares.</td></tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </section>
      } @else {
          <section class="tarjeta">
            <div class="barra">
              <div class="navegacion">
                <button mat-icon-button type="button" aria-label="Meses anteriores" (click)="moverMeses(-3)">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <strong>{{ fechaLocal(desde()) | date: 'MMMM y' }} – {{ fechaLocal(ultimoMes()) | date: 'MMMM y' }}</strong>
                <button mat-icon-button type="button" aria-label="Meses siguientes" (click)="moverMeses(3)">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
              <span class="espacio"></span>
              @if (sesion.puede('Calendario', 'Crear')) {
                <button mat-flat-button class="boton-azul" type="button" (click)="editarEvento(null)">
                  <mat-icon aria-hidden="true">add</mat-icon>
                  Nuevo evento
                </button>
              }
            </div>
            @if (cargandoEventos()) {
              <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
            }
            <div class="desplazable">
              <table class="tabla">
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Evento</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Visible</th>
                    <th scope="col"><span class="visualmente-oculto">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of eventos(); track e.id) {
                    <tr>
                      <td class="fecha">
                        {{ fechaLocal(e.inicio) | date: 'EEE d MMM' }}
                        @if (e.fin !== e.inicio) {
                          <span class="detalle">al {{ fechaLocal(e.fin) | date: 'EEE d MMM' }}</span>
                        }
                      </td>
                      <th scope="row">
                        {{ e.titulo }}
                        <span class="detalle">{{ lugarHora(e) }}</span>
                      </th>
                      <td><span class="tipo" [attr.data-tipo]="e.tipo">{{ tiposEvento[e.tipo] }}</span></td>
                      <td>{{ e.publico ? 'Página pública y campus' : 'Solo campus' }}</td>
                      <td class="acciones">
                        @if (sesion.puede('Calendario', 'Editar')) {
                          <button mat-icon-button type="button" matTooltip="Editar" aria-label="Editar" (click)="editarEvento(e)">
                            <mat-icon>edit</mat-icon>
                          </button>
                        }
                        @if (sesion.puede('Calendario', 'Eliminar')) {
                          <button mat-icon-button type="button" matTooltip="Eliminar" aria-label="Eliminar" (click)="eliminarEvento(e)">
                            <mat-icon>delete</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    @if (!cargandoEventos()) {
                      <tr><td colspan="5" class="vacio">No hay eventos en estos meses.</td></tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <p class="ayuda">Los eventos públicos se ven en <a href="calendario" target="_blank">la página del calendario</a>.</p>
          </section>
      }
    </div>
  `,
  styles: `

    .barra {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block-end: 1rem;

      .espacio {
        flex: 1;
      }
    }

    .navegacion {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      text-transform: capitalize;
    }

    .ayuda {
      flex: 1 1 20rem;
      margin: 0;
      color: var(--jv-texto-suave);
    }

    .desplazable {
      overflow-x: auto;
    }

    .tabla {
      inline-size: 100%;
      border-collapse: collapse;
      margin-block-end: 1rem;

      th,
      td {
        padding: 0.55rem 0.6rem;
        border-block-end: 1px solid var(--jv-borde);
        text-align: start;
        vertical-align: top;
      }

      thead th {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .codigo {
        display: block;
        color: var(--jv-azul);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .clip {
        font-size: 16px;
        inline-size: 16px;
        block-size: 16px;
        vertical-align: middle;
        color: var(--jv-texto-suave);
      }

      .detalle {
        display: block;
        color: var(--jv-texto-suave);
        font-size: 0.82rem;
        font-weight: 400;
      }

      .fecha {
        white-space: nowrap;
        text-transform: capitalize;
      }

      .lectura {
        min-inline-size: 11rem;
      }

      .acciones {
        text-align: end;
        white-space: nowrap;
      }

      .vacio {
        padding: 2rem;
        color: var(--jv-texto-suave);
        text-align: center;
      }
    }

    .medidor {
      block-size: 8px;
      border-radius: 4px;
      background: var(--jv-superficie-suave);
      overflow: hidden;

      span {
        display: block;
        block-size: 100%;
        background: var(--jv-azul);
      }
    }

    .estado,
    .tipo {
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .estado.publicada {
      background: #e5f5ec;
      border-color: #b9e2c9;
    }

    .tipo[data-tipo='Festivo'] {
      background: #fdecec;
      border-color: #f2b8b8;
    }

    .tipo[data-tipo='Evaluacion'] {
      background: #fff6e0;
      border-color: #f0d58c;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ComunicacionesAdminComponent implements OnInit {
  /** Llega de `data` en la ruta. */
  readonly seccion = input<SeccionComunicaciones>('circulares');

  readonly #servicio = inject(ComunicacionesService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly sesion = inject(SesionService);

  protected readonly publicos = PUBLICOS_CIRCULAR;
  protected readonly tiposEvento = TIPOS_EVENTO;
  protected readonly fechaLocal = fechaLocal;

  protected readonly circulares = signal<Circular[]>([]);
  protected readonly eventos = signal<Evento[]>([]);
  protected readonly cargandoCirculares = signal(false);
  protected readonly cargandoEventos = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly desde = signal(primeroDelMes(hoyColombia(), 0));
  protected readonly ultimoMes = signal(primeroDelMes(hoyColombia(), 2));

  ngOnInit(): void {
    void (this.seccion() === 'circulares' ? this.cargarCirculares() : this.cargarEventos());
  }

  protected porcentaje(parte: number, total: number): number {
    return total ? (parte * 100) / total : 0;
  }

  protected lugarHora(e: Evento): string {
    return [e.hora, e.lugar].filter(Boolean).join(' · ');
  }

  protected gradosDe(c: Circular): string {
    return c.grados.length ? c.grados.map(nombreGrado).join(', ') : c.publico === 'Docentes' ? '' : 'Todos los grados';
  }

  async cargarCirculares(): Promise<void> {
    this.cargandoCirculares.set(true);
    try {
      this.circulares.set(await this.#servicio.circulares());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargandoCirculares.set(false);
    }
  }

  async cargarEventos(): Promise<void> {
    this.cargandoEventos.set(true);
    try {
      const hasta = primeroDelMes(this.ultimoMes(), 1);
      this.eventos.set(await this.#servicio.eventos(this.desde(), hasta));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoEventos.set(false);
    }
  }

  protected moverMeses(meses: number): void {
    this.desde.update((d) => primeroDelMes(d, meses));
    this.ultimoMes.update((d) => primeroDelMes(d, meses));
    void this.cargarEventos();
  }

  protected async editarCircular(c: Circular | null): Promise<void> {
    const guardada = await firstValueFrom(
      this.#dialog
        .open<CircularDialogComponent, Circular | null, Circular>(CircularDialogComponent, {
          data: c,
          width: '720px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (guardada) {
      this.circulares.update((lista) => (c ? lista.map((x) => (x.id === c.id ? guardada : x)) : [guardada, ...lista]));
      this.#snackBar.open(c ? 'Circular actualizada.' : `Borrador ${guardada.codigo} creado. Publíquelo cuando esté listo.`, 'Cerrar', {
        duration: 4000,
      });
    }
  }

  protected async publicar(c: Circular): Promise<void> {
    if (
      !(await this.#confirmar(
        'Publicar circular',
        `¿Publicar ${c.codigo} «${c.titulo}»? Llegará a ${c.destinatarios} destinatarios en el campus y por correo.`,
        'Publicar',
      ))
    ) {
      return;
    }
    try {
      const publicada = await this.#servicio.publicarCircular(c.id);
      this.circulares.update((lista) => lista.map((x) => (x.id === c.id ? publicada : x)));
      this.#snackBar.open('Circular publicada.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected verPendientes(c: Circular): void {
    this.#dialog.open(PendientesDialogComponent, { data: c, width: '620px', maxWidth: '95vw' });
  }

  protected async eliminarCircular(c: Circular): Promise<void> {
    if (!(await this.#confirmar('Eliminar circular', `¿Eliminar ${c.codigo} «${c.titulo}»?`, 'Eliminar'))) {
      return;
    }
    try {
      await this.#servicio.eliminarCircular(c.id);
      this.circulares.update((lista) => lista.filter((x) => x.id !== c.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async editarEvento(e: Evento | null): Promise<void> {
    const guardado = await firstValueFrom(
      this.#dialog
        .open<EventoDialogComponent, Evento | null, Evento>(EventoDialogComponent, {
          data: e,
          width: '620px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (guardado) {
      await this.cargarEventos();
      this.#snackBar.open('Evento guardado.', 'Cerrar', { duration: 3000 });
    }
  }

  protected async eliminarEvento(e: Evento): Promise<void> {
    if (!(await this.#confirmar('Eliminar evento', `¿Eliminar «${e.titulo}»?`, 'Eliminar'))) {
      return;
    }
    try {
      await this.#servicio.eliminarEvento(e.id);
      this.eventos.update((lista) => lista.filter((x) => x.id !== e.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  #confirmar(titulo: string, mensaje: string, confirmar: string): Promise<boolean | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data: { titulo, mensaje, confirmar } })
        .afterClosed(),
    );
  }
}

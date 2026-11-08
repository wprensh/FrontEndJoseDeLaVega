import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ProblemDetails } from '../../../core/models/api.models';
import { AREAS, LETRAS, Presentacion, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';

type EstadoGuardado = 'guardado' | 'guardando' | 'error';

/**
 * Presentación de un simulacro: una pregunta a la vez, mapa de preguntas, cronómetro y guardado automático
 * de cada respuesta en el servidor (si se cae la conexión o se cierra la sesión, al volver continúa donde iba).
 * Al agotarse el tiempo se entrega sola.
 */
@Component({
  selector: 'app-presentar-simulacro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="contenedor">
      @if (error(); as e) {
        <div class="tarjeta">
          <p class="aviso-error" role="alert">{{ e }}</p>
          <a mat-stroked-button routerLink="/campus/simulacros">Volver a simulacros</a>
        </div>
      }

      @if (presentacion(); as p) {
        <header class="barra" [class.urgente]="segundosRestantes() < 300">
          <div>
            <span class="tipo">{{ tipos[p.tipo] }}</span>
            <h1>{{ p.titulo }}</h1>
          </div>
          <div class="reloj" role="timer" [attr.aria-label]="'Tiempo restante ' + reloj()">
            <mat-icon aria-hidden="true">timer</mat-icon>
            {{ reloj() }}
          </div>
          <div class="progreso">
            <span>{{ respondidas() }} de {{ p.preguntas.length }} respondidas</span>
            <span class="guardado" [attr.data-estado]="guardado()" aria-live="polite">
              @switch (guardado()) {
                @case ('guardando') { Guardando... }
                @case ('error') { Sin conexión: reintentando }
                @default { <mat-icon aria-hidden="true">cloud_done</mat-icon> Guardado }
              }
            </span>
          </div>
        </header>

        @if (p.instrucciones && indice() === 0) {
          <p class="tarjeta instrucciones">{{ p.instrucciones }}</p>
        }

        <div class="cuerpo">
          @if (actual(); as q) {
            <section class="tarjeta pregunta" [attr.aria-labelledby]="'enunciado-' + q.id">
              <p class="meta">Pregunta {{ indice() + 1 }} · {{ areas[q.area] }}{{ q.competencia ? ' · ' + q.competencia : '' }}</p>
              @if (q.contexto) {
                <div class="contexto">{{ q.contexto }}</div>
              }
              @if (q.imagenUrl) {
                <img class="imagen" [src]="q.imagenUrl" alt="Imagen de la pregunta" loading="lazy" />
              }
              <p class="enunciado" [id]="'enunciado-' + q.id">{{ q.enunciado }}</p>

              <div class="opciones" role="radiogroup" [attr.aria-labelledby]="'enunciado-' + q.id">
                @for (o of q.opciones; track $index) {
                  <button
                    type="button"
                    role="radio"
                    class="opcion"
                    [class.elegida]="respuestas()[q.id] === $index"
                    [attr.aria-checked]="respuestas()[q.id] === $index"
                    (click)="elegir(q.id, $index)"
                  >
                    <span class="letra">{{ letras[$index] }}</span>
                    <span>{{ o }}</span>
                  </button>
                }
              </div>
              @if (respuestas()[q.id] !== undefined) {
                <button mat-button type="button" class="borrar" (click)="elegir(q.id, null)">Borrar respuesta</button>
              }

              <div class="navegacion">
                <button mat-stroked-button type="button" [disabled]="indice() === 0" (click)="ir(indice() - 1)">
                  <mat-icon aria-hidden="true">chevron_left</mat-icon>
                  Anterior
                </button>
                @if (indice() < p.preguntas.length - 1) {
                  <button mat-flat-button class="boton-azul" type="button" (click)="ir(indice() + 1)">
                    Siguiente
                    <mat-icon iconPositionEnd aria-hidden="true">chevron_right</mat-icon>
                  </button>
                } @else {
                  <button mat-flat-button class="boton-institucional" type="button" [disabled]="entregando()" (click)="confirmarEntrega()">
                    Entregar
                  </button>
                }
              </div>
            </section>
          }

          <aside class="tarjeta mapa" aria-label="Mapa de preguntas">
            <h2>Preguntas</h2>
            <ol>
              @for (q of p.preguntas; track q.id) {
                <li>
                  <button
                    type="button"
                    [class.respondida]="respuestas()[q.id] !== undefined"
                    [class.actual]="$index === indice()"
                    [attr.aria-label]="'Pregunta ' + ($index + 1) + (respuestas()[q.id] !== undefined ? ', respondida' : ', sin responder')"
                    (click)="ir($index)"
                  >
                    {{ $index + 1 }}
                  </button>
                </li>
              }
            </ol>
            <button mat-flat-button class="boton-institucional entregar" type="button" [disabled]="entregando()" (click)="confirmarEntrega()">
              <mat-icon aria-hidden="true">send</mat-icon>
              {{ entregando() ? 'Entregando...' : 'Entregar simulacro' }}
            </button>
          </aside>
        </div>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Preparando el simulacro" />
      }
    </div>
  `,
  styles: `
    .barra {
      position: sticky;
      inset-block-start: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block-end: 1rem;
      padding: 0.8rem 1.2rem;
      background: var(--jv-azul);
      color: #fff;
      border-radius: var(--jv-radio);

      h1 {
        margin: 0;
        font-family: var(--jv-fuente-titulos);
        font-size: 1.1rem;
      }

      &.urgente .reloj {
        background: var(--jv-rojo);
        color: #fff;
      }
    }

    .tipo {
      color: var(--jv-amarillo);
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .reloj {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-inline-start: auto;
      padding: 0.35rem 0.8rem;
      border-radius: 6px;
      background: var(--jv-amarillo);
      color: var(--jv-azul);
      font-family: var(--jv-fuente-titulos);
      font-size: 1.25rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .progreso {
      display: grid;
      font-size: 0.85rem;
      text-align: end;
    }

    .guardado {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.2rem;
      opacity: 0.85;

      mat-icon {
        font-size: 16px;
        inline-size: 16px;
        block-size: 16px;
      }

      &[data-estado='error'] {
        color: var(--jv-amarillo);
        opacity: 1;
      }
    }

    .instrucciones {
      white-space: pre-line;
    }

    .cuerpo {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      gap: 1rem;
      align-items: start;

      @media (max-width: 860px) {
        grid-template-columns: 1fr;
      }
    }

    .meta {
      margin: 0 0 0.6rem;
      color: var(--jv-azul-medio);
      font-weight: 700;
      font-size: 0.85rem;
    }

    .contexto {
      margin-block-end: 0.8rem;
      padding: 0.8rem 1rem;
      background: var(--jv-superficie-suave);
      border-left: 3px solid var(--jv-azul-medio);
      white-space: pre-line;
      line-height: 1.55;
    }

    .imagen {
      display: block;
      max-inline-size: 100%;
      margin-block-end: 0.8rem;
      border-radius: 6px;
    }

    .enunciado {
      font-size: 1.08rem;
      font-weight: 600;
      white-space: pre-line;
    }

    .opciones {
      display: grid;
      gap: 0.5rem;
    }

    .opcion {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.9rem;
      border: 2px solid var(--jv-borde);
      border-radius: var(--jv-radio);
      background: var(--jv-superficie);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        border-color: var(--jv-azul-medio);
      }

      &.elegida {
        border-color: var(--jv-azul);
        background: #e8eef8;
      }
    }

    .letra {
      display: grid;
      place-items: center;
      flex: none;
      inline-size: 1.8rem;
      block-size: 1.8rem;
      border-radius: 50%;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-weight: 800;

      .elegida & {
        background: var(--jv-azul);
        border-color: var(--jv-azul);
        color: var(--jv-amarillo);
      }
    }

    .borrar {
      margin-block-start: 0.3rem;
    }

    .navegacion {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-block-start: 1.2rem;
    }

    .mapa {
      position: sticky;
      inset-block-start: 6rem;

      h2 {
        margin: 0 0 0.6rem;
        color: var(--jv-azul);
        font-size: 1rem;
      }

      ol {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(2.4rem, 1fr));
        gap: 0.35rem;
        margin: 0 0 1rem;
        padding: 0;
        list-style: none;
      }

      li button {
        inline-size: 100%;
        aspect-ratio: 1;
        border: 1px solid var(--jv-borde);
        border-radius: 6px;
        background: var(--jv-superficie);
        font: inherit;
        font-weight: 700;
        cursor: pointer;

        &.respondida {
          background: var(--jv-azul);
          border-color: var(--jv-azul);
          color: #fff;
        }

        &.actual {
          outline: 3px solid var(--jv-amarillo);
          outline-offset: 1px;
        }
      }

      .entregar {
        inline-size: 100%;
      }
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class PresentarSimulacroComponent implements OnInit {
  readonly id = input.required<string>();

  readonly #servicio = inject(CampusAcademicoService);
  readonly #router = inject(Router);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly areas = AREAS;
  protected readonly letras = LETRAS;

  protected readonly presentacion = signal<Presentacion | null>(null);
  protected readonly respuestas = signal<Record<string, number>>({});
  protected readonly indice = signal(0);
  protected readonly guardado = signal<EstadoGuardado>('guardado');
  protected readonly entregando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly segundosRestantes = signal(0);

  protected readonly actual = computed(() => this.presentacion()?.preguntas[this.indice()] ?? null);
  protected readonly respondidas = computed(() => Object.keys(this.respuestas()).length);
  protected readonly reloj = computed(() => {
    const total = Math.max(0, this.segundosRestantes());
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  });

  /** Respuestas que no se pudieron guardar todavía (se reintentan). */
  readonly #pendientes = new Map<string, number | null>();
  #limite = 0;
  #desfase = 0;

  async ngOnInit(): Promise<void> {
    try {
      const p = await this.#servicio.iniciarSimulacro(this.id());
      // Corrige la diferencia entre el reloj del equipo y el del servidor.
      this.#desfase = Date.parse(p.ahora) - Date.now();
      this.#limite = Date.parse(p.limiteEn);
      this.respuestas.set({ ...p.respuestas });
      this.presentacion.set(p);
      const primeraSinResponder = p.preguntas.findIndex((q) => p.respuestas[q.id] === undefined);
      this.indice.set(primeraSinResponder > 0 ? primeraSinResponder : 0);
      this.#iniciarReloj();
    } catch (error) {
      if (this.#codigo(error) === 'Simulacro.YaEntregado') {
        await this.#router.navigate(['/campus/simulacros', this.id(), 'resultado'], { replaceUrl: true });
        return;
      }
      this.error.set(mensajeDeError(error));
    }
  }

  protected ir(indice: number): void {
    this.indice.set(indice);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected elegir(preguntaId: string, opcion: number | null): void {
    this.respuestas.update((r) => {
      const copia = { ...r };
      if (opcion === null) {
        delete copia[preguntaId];
      } else {
        copia[preguntaId] = opcion;
      }
      return copia;
    });
    this.#pendientes.set(preguntaId, opcion);
    void this.#guardarPendientes();
  }

  protected async confirmarEntrega(): Promise<void> {
    const total = this.presentacion()?.preguntas.length ?? 0;
    const faltan = total - this.respondidas();
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Entregar simulacro',
            mensaje: faltan
              ? `Le faltan ${faltan} ${faltan === 1 ? 'pregunta' : 'preguntas'} por responder. Después de entregar no podrá cambiar sus respuestas.`
              : 'Respondió todas las preguntas. Después de entregar no podrá cambiar sus respuestas.',
            confirmar: 'Entregar',
          },
        })
        .afterClosed(),
    );
    if (confirmado) {
      await this.#entregar();
    }
  }

  #iniciarReloj(): void {
    const actualizar = (): void => {
      const restantes = Math.round((this.#limite - (Date.now() + this.#desfase)) / 1000);
      this.segundosRestantes.set(restantes);
      if (restantes <= 0 && !this.entregando()) {
        void this.#entregar(true);
      }
    };
    actualizar();
    const temporizador = setInterval(actualizar, 1000);
    const reintento = setInterval(() => void this.#guardarPendientes(), 10_000);
    const alSalir = (evento: BeforeUnloadEvent): void => {
      if (this.#pendientes.size) {
        evento.preventDefault();
      }
    };
    window.addEventListener('beforeunload', alSalir);
    this.#destroyRef.onDestroy(() => {
      clearInterval(temporizador);
      clearInterval(reintento);
      window.removeEventListener('beforeunload', alSalir);
    });
  }

  async #guardarPendientes(): Promise<void> {
    if (!this.#pendientes.size || this.guardado() === 'guardando') {
      return;
    }
    this.guardado.set('guardando');
    try {
      for (const [preguntaId, opcion] of [...this.#pendientes]) {
        await this.#servicio.responder(this.id(), preguntaId, opcion);
        if (this.#pendientes.get(preguntaId) === opcion) {
          this.#pendientes.delete(preguntaId);
        }
      }
      this.guardado.set('guardado');
      // Pudo llegar otra respuesta mientras se guardaba.
      if (this.#pendientes.size) {
        void this.#guardarPendientes();
      }
    } catch (error) {
      const codigo = this.#codigo(error);
      if (codigo === 'Simulacro.TiempoAgotado' || codigo === 'Simulacro.YaEntregado') {
        this.#pendientes.clear();
        await this.#router.navigate(['/campus/simulacros', this.id(), 'resultado'], { replaceUrl: true });
        return;
      }
      this.guardado.set('error');
    }
  }

  async #entregar(porTiempo = false): Promise<void> {
    this.entregando.set(true);
    try {
      await this.#guardarPendientes();
      await this.#servicio.entregar(this.id());
      if (porTiempo) {
        this.#snackBar.open('Se acabó el tiempo: el simulacro se entregó con las respuestas guardadas.', 'Cerrar', {
          duration: 8000,
        });
      }
      await this.#router.navigate(['/campus/simulacros', this.id(), 'resultado'], { replaceUrl: true });
    } catch (error) {
      if (this.#codigo(error) === 'Simulacro.YaEntregado') {
        await this.#router.navigate(['/campus/simulacros', this.id(), 'resultado'], { replaceUrl: true });
        return;
      }
      this.entregando.set(false);
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  #codigo(error: unknown): string | undefined {
    return error instanceof HttpErrorResponse ? (error.error as ProblemDetails | null)?.code : undefined;
  }
}

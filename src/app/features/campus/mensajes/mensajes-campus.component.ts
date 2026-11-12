import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { ContactoMensaje, Conversacion, ConversacionResumen } from '../../../core/models/mejoras.model';
import { CampusService } from '../../../core/services/campus.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/**
 * Mensajería del campus: acudientes y estudiantes escriben a sus docentes, y los docentes a las familias de sus
 * cursos. Cada mensaje llega como aviso y notificación push; el docente puede cerrar la conversación.
 */
@Component({
  selector: 'app-mensajes-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    EncabezadoCampusComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Mensajes" [subtitulo]="subtitulo()" icono="forum">
        <button mat-flat-button class="boton-institucional" type="button" (click)="nueva()">
          <mat-icon aria-hidden="true">edit</mat-icon>
          Nuevo mensaje
        </button>
      </app-encabezado-campus>

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      <div class="mensajeria" [class.con-abierta]="abierta() || redactando()">
        <nav class="tarjeta bandeja" aria-label="Conversaciones">
          @if (!conversaciones()) {
            <mat-progress-bar mode="indeterminate" aria-label="Cargando conversaciones" />
          }
          <ul>
            @for (c of conversaciones() ?? []; track c.id) {
              <li>
                <button type="button" [class.activa]="abierta()?.conversacion?.id === c.id" [class.no-leida]="c.noLeida" (click)="abrir(c.id)">
                  <span class="fila">
                    <strong>{{ c.otro }}</strong>
                    <time [attr.datetime]="c.ultimoMensajeEn">{{ c.ultimoMensajeEn | date: 'd MMM' }}</time>
                  </span>
                  <span class="asunto">{{ c.asunto }}@if (c.cerrada) { · cerrada}</span>
                  <span class="detalle">{{ c.estudiante }} ({{ c.curso }}) · {{ c.ultimoTexto }}</span>
                </button>
              </li>
            } @empty {
              @if (conversaciones()) {
                <li class="vacio">Sin conversaciones todavía.</li>
              }
            }
          </ul>
        </nav>

        <section class="tarjeta panel" aria-live="polite">
          @if (redactando()) {
            <form class="redactar" (ngSubmit)="enviarNueva()">
              <h2>Nuevo mensaje</h2>
              <mat-form-field>
                <mat-label>Para</mat-label>
                <mat-select name="contacto" [(ngModel)]="contactoClave" required>
                  @for (c of contactos(); track clave(c)) {
                    <mat-option [value]="clave(c)">{{ c.nombreCompleto }} · {{ c.detalle }}</mat-option>
                  } @empty {
                    <mat-option disabled>No hay contactos disponibles</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Asunto</mat-label>
                <input matInput name="asunto" maxlength="150" required [(ngModel)]="asunto" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Mensaje</mat-label>
                <textarea matInput name="texto" rows="5" maxlength="2000" required [(ngModel)]="texto"></textarea>
              </mat-form-field>
              <p class="texto-suave ayuda">Escriba con respeto. Los mensajes quedan registrados y el docente responde en horario escolar.</p>
              <div class="acciones-fila">
                <button mat-button type="button" (click)="redactando.set(false)">Cancelar</button>
                <button mat-flat-button class="boton-institucional" type="submit" [disabled]="enviando()">Enviar</button>
              </div>
            </form>
          } @else {
          @if (abierta(); as a) {
            <header class="cabecera-chat">
              <button mat-icon-button type="button" class="solo-movil" aria-label="Volver a las conversaciones" (click)="cerrarPanel()">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div>
                <h2>{{ a.conversacion.asunto }}</h2>
                <p class="texto-suave">{{ a.conversacion.otro }} · sobre {{ a.conversacion.estudiante }} ({{ a.conversacion.curso }})</p>
              </div>
              @if (esDocente() && !a.conversacion.cerrada) {
                <button mat-button type="button" (click)="cerrarConversacion(a.conversacion)">Cerrar conversación</button>
              }
            </header>
            <ol class="mensajes" #lista>
              @for (m of a.mensajes; track m.id) {
                <li [class.propio]="m.propio">
                  <span class="burbuja pre-linea">{{ m.texto }}</span>
                  <small class="texto-suave">{{ m.propio ? 'Usted' : m.autor }} · {{ m.enviadoEn | date: 'd MMM, h:mm a' }}</small>
                </li>
              }
            </ol>
            @if (a.conversacion.cerrada) {
              <p class="texto-suave cerrada">El docente cerró esta conversación. Si necesita algo más, inicie una nueva.</p>
            } @else {
              <form class="responder" (ngSubmit)="responder(a.conversacion.id)">
                <mat-form-field>
                  <mat-label>Escriba su respuesta</mat-label>
                  <textarea matInput name="respuesta" rows="2" maxlength="2000" [(ngModel)]="respuesta"></textarea>
                </mat-form-field>
                <button mat-flat-button class="boton-institucional" type="submit" [disabled]="enviando() || !respuesta.trim()">
                  <mat-icon aria-hidden="true">send</mat-icon>
                  Enviar
                </button>
              </form>
            }
          } @else {
            <p class="texto-suave vacio">Elija una conversación o escriba un mensaje nuevo.</p>
          }
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .mensajeria {
      display: grid;
      grid-template-columns: minmax(240px, 340px) 1fr;
      gap: 1rem;
      align-items: start;
    }

    .bandeja {
      padding: 0.5rem;

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      button {
        display: grid;
        gap: 0.15rem;
        inline-size: 100%;
        padding: 0.65rem 0.75rem;
        border: 0;
        border-radius: 8px;
        background: none;
        font: inherit;
        text-align: start;
        cursor: pointer;

        &:hover,
        &.activa {
          background: var(--jv-superficie-suave);
        }

        &.no-leida strong::before {
          content: '● ';
          color: var(--jv-rojo);
        }
      }

      .fila {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        color: var(--jv-azul);
      }

      .asunto {
        font-weight: 600;
      }

      .detalle {
        overflow: hidden;
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }

    .panel {
      min-block-size: 360px;
      display: flex;
      flex-direction: column;
    }

    h2 {
      margin: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .cabecera-chat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-block-end: 0.75rem;
      border-block-end: 1px solid var(--jv-borde);

      div {
        flex: 1;
      }

      p {
        margin: 0.15rem 0 0;
      }
    }

    .mensajes {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-block-size: 55vh;
      overflow-y: auto;
      margin: 0;
      padding: 1rem 0;
      list-style: none;

      li {
        display: grid;
        justify-items: start;
        gap: 0.2rem;
        max-inline-size: 85%;
      }

      li.propio {
        align-self: flex-end;
        justify-items: end;
      }

      .burbuja {
        padding: 0.6rem 0.9rem;
        border-radius: 14px;
        background: var(--jv-superficie-suave);
      }

      .propio .burbuja {
        background: var(--jv-azul);
        color: #fff;
      }
    }

    .responder {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      mat-form-field {
        flex: 1;
      }
    }

    .redactar {
      display: grid;
      gap: 0.5rem;
    }

    .ayuda {
      margin: 0;
      font-size: 0.85rem;
    }

    .vacio {
      margin: auto;
      padding: 1rem;
      text-align: center;
    }

    .solo-movil {
      display: none;
    }

    @media (width < 760px) {
      .mensajeria {
        grid-template-columns: 1fr;
      }

      .mensajeria.con-abierta .bandeja,
      .mensajeria:not(.con-abierta) .panel {
        display: none;
      }

      .solo-movil {
        display: inline-flex;
      }
    }
  `,
})
export class MensajesCampusComponent implements OnInit {
  /** ?c=<id> abre esa conversación (enlace de los avisos y de las notificaciones). */
  readonly c = input<string>();

  readonly #servicio = inject(CampusMejorasService);
  readonly #campus = inject(CampusService);
  readonly #router = inject(Router);
  readonly #snackBar = inject(MatSnackBar);
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  protected readonly conversaciones = signal<ConversacionResumen[] | null>(null);
  protected readonly abierta = signal<Conversacion | null>(null);
  protected readonly contactos = signal<ContactoMensaje[]>([]);
  protected readonly redactando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly esDocente = computed(() => this.#campus.perfil()?.rol === 'Docente');
  protected readonly subtitulo = computed(() =>
    this.esDocente() ? 'Conversaciones con las familias y estudiantes de sus cursos' : 'Comunicación directa con los docentes',
  );
  protected contactoClave = '';
  protected asunto = '';
  protected texto = '';
  protected respuesta = '';

  constructor() {
    // Baja al último mensaje cada vez que cambia la conversación abierta.
    effect(() => {
      if (this.abierta()) {
        queueMicrotask(() => {
          const lista = this.lista()?.nativeElement;
          lista?.scrollTo({ top: lista.scrollHeight });
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.#cargarBandeja();
    const id = this.c();
    if (id) {
      await this.abrir(id);
    }
  }

  protected clave(c: ContactoMensaje): string {
    return `${c.id}|${c.estudianteId}`;
  }

  protected async nueva(): Promise<void> {
    this.redactando.set(true);
    this.abierta.set(null);
    if (!this.contactos().length) {
      try {
        this.contactos.set(await this.#servicio.contactos());
      } catch (error) {
        this.#snackBar.open(mensajeDeError(error), 'Cerrar');
      }
    }
  }

  protected async abrir(id: string): Promise<void> {
    this.redactando.set(false);
    try {
      const conversacion = await this.#servicio.conversacion(id);
      this.abierta.set(conversacion);
      this.conversaciones.update((l) => l?.map((c) => (c.id === id ? { ...c, noLeida: false } : c)) ?? l);
      void this.#router.navigate([], { queryParams: { c: id }, replaceUrl: true });
      void this.#servicio.bandeja().catch(() => undefined);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected cerrarPanel(): void {
    this.abierta.set(null);
    void this.#router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected async enviarNueva(): Promise<void> {
    const contacto = this.contactos().find((c) => this.clave(c) === this.contactoClave);
    if (!contacto || !this.asunto.trim() || !this.texto.trim()) {
      this.#snackBar.open('Elija a quién escribe, el asunto y el mensaje.', 'Cerrar');
      return;
    }
    this.enviando.set(true);
    try {
      const conversacion = await this.#servicio.iniciarConversacion({
        destinatarioId: contacto.id,
        estudianteId: contacto.estudianteId,
        asunto: this.asunto.trim(),
        texto: this.texto.trim(),
      });
      this.asunto = '';
      this.texto = '';
      this.contactoClave = '';
      this.redactando.set(false);
      this.abierta.set(conversacion);
      await this.#cargarBandeja();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.enviando.set(false);
    }
  }

  protected async responder(id: string): Promise<void> {
    this.enviando.set(true);
    try {
      this.abierta.set(await this.#servicio.responder(id, this.respuesta.trim()));
      this.respuesta = '';
      await this.#cargarBandeja();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.enviando.set(false);
    }
  }

  protected async cerrarConversacion(c: ConversacionResumen): Promise<void> {
    if (!confirm('¿Cerrar la conversación? La familia ya no podrá responder en ella.')) {
      return;
    }
    try {
      this.abierta.set(await this.#servicio.cerrarConversacion(c.id));
      await this.#cargarBandeja();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  async #cargarBandeja(): Promise<void> {
    try {
      this.conversaciones.set([...(await this.#servicio.bandeja()).conversaciones]);
    } catch (error) {
      this.error.set(mensajeDeError(error));
      this.conversaciones.set([]);
    }
  }
}

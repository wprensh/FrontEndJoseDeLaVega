import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { formatoNota } from '../../../core/models/academico.model';
import { Actividad, ArchivoAula, AulaEstudiante, TIPOS_ARCHIVO_AULA, tamanoLegible } from '../../../core/models/mejoras.model';
import { CampusService } from '../../../core/services/campus.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent } from '../compartido/selector-estudiante.component';
import { archivoValido, descargarArchivoAula, iconoArchivo } from './archivo-aula';

type Filtro = 'pendientes' | 'todas' | 'material';

interface EstadoActividad {
  readonly texto: string;
  readonly tono: 'ok' | 'alerta' | 'peligro' | '';
}

/**
 * Aula virtual del estudiante y del acudiente: material de clase, tareas con fecha de entrega, la entrega del
 * estudiante (texto, enlace o archivo) y la nota con el comentario del docente.
 */
@Component({
  selector: 'app-aula-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    EncabezadoCampusComponent,
    SelectorEstudianteComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Aula virtual" subtitulo="Material de clase, tareas y entregas" icono="auto_stories" />
      @if (!esEstudiante()) {
        <app-selector-estudiante [(estudianteId)]="estudianteId" />
      }

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (aula(); as a) {
        <ul class="resumen">
          <li class="tarjeta"><strong>{{ conteo().pendientes }}</strong><span>Tareas pendientes</span></li>
          <li class="tarjeta"><strong>{{ conteo().entregadas }}</strong><span>Entregadas</span></li>
          <li class="tarjeta"><strong>{{ conteo().material }}</strong><span>Materiales</span></li>
        </ul>

        <mat-button-toggle-group class="filtro" aria-label="Mostrar" [value]="filtro()" (change)="filtro.set($event.value)">
          <mat-button-toggle value="pendientes">Pendientes</mat-button-toggle>
          <mat-button-toggle value="todas">Todas</mat-button-toggle>
          <mat-button-toggle value="material">Material</mat-button-toggle>
        </mat-button-toggle-group>

        <ul class="actividades">
          @for (act of visibles(); track act.id) {
            <li class="tarjeta actividad" [class.tarea]="act.tipo === 'Tarea'">
              <div class="cabecera">
                <mat-icon aria-hidden="true">{{ act.tipo === 'Tarea' ? 'assignment' : 'menu_book' }}</mat-icon>
                <div>
                  <h2>{{ act.titulo }}</h2>
                  <p class="texto-suave">{{ act.asignatura }}@if (act.docente) { · {{ act.docente }}} · {{ act.creadoEn | date: 'd MMM' }}</p>
                </div>
                @if (estado(act); as e) {
                  <span class="etiqueta-estado" [attr.data-tono]="e.tono">{{ e.texto }}</span>
                }
              </div>

              @if (act.descripcion) {
                <p class="pre-linea">{{ act.descripcion }}</p>
              }
              <div class="acciones-fila">
                @if (act.fechaEntrega) {
                  <span class="fecha"><mat-icon aria-hidden="true" inline>event</mat-icon> Entrega: {{ act.fechaEntrega | date: "EEE d 'de' MMM, h:mm a" }}</span>
                }
                @if (act.enlace) {
                  <a mat-stroked-button [href]="act.enlace" target="_blank" rel="noopener"><mat-icon aria-hidden="true">link</mat-icon> Abrir enlace</a>
                }
                @if (act.archivo; as f) {
                  <button mat-stroked-button type="button" (click)="descargar(f)">
                    <mat-icon aria-hidden="true">{{ icono(f) }}</mat-icon> {{ f.nombreArchivo }} ({{ tamano(f.tamano) }})
                  </button>
                }
              </div>

              @if (act.miEntrega; as m) {
                @if (m.entregadaEn) {
                  <div class="entrega">
                    <strong>Entrega del {{ m.entregadaEn | date: "d MMM, h:mm a" }}@if (m.tarde) { (tarde)}</strong>
                    @if (m.texto) { <p class="pre-linea">{{ m.texto }}</p> }
                    @if (m.enlace) { <a [href]="m.enlace" target="_blank" rel="noopener">{{ m.enlace }}</a> }
                    @if (m.archivo; as f) {
                      <button mat-button type="button" (click)="descargar(f)"><mat-icon aria-hidden="true">attach_file</mat-icon> {{ f.nombreArchivo }}</button>
                    }
                    @if (m.nota !== null) {
                      <p class="nota">Nota: <strong>{{ nota(m.nota) }}</strong>@if (m.comentario) { · {{ m.comentario }}}</p>
                    }
                  </div>
                }
              }

              @if (esEstudiante() && act.tipo === 'Tarea' && act.miEntrega?.nota == null) {
                @if (abierta() === act.id) {
                  <form class="formulario-entrega" (ngSubmit)="entregar(act)">
                    <mat-form-field>
                      <mat-label>Respuesta o comentario</mat-label>
                      <textarea matInput name="texto" rows="3" maxlength="4000" [(ngModel)]="texto"></textarea>
                    </mat-form-field>
                    <mat-form-field>
                      <mat-label>Enlace (Drive, YouTube, Canva…)</mat-label>
                      <input matInput name="enlace" type="url" maxlength="500" [(ngModel)]="enlace" />
                    </mat-form-field>
                    <div class="acciones-fila">
                      <label mat-stroked-button class="subir">
                        <mat-icon aria-hidden="true">upload_file</mat-icon>
                        {{ archivo()?.nombreArchivo ?? 'Adjuntar archivo (PDF, foto u Office, 5 MB)' }}
                        <input type="file" [accept]="tipos" (change)="adjuntar($event)" hidden />
                      </label>
                      <button mat-flat-button class="boton-institucional" type="submit" [disabled]="enviando()">
                        {{ enviando() ? 'Enviando…' : act.miEntrega?.entregadaEn ? 'Actualizar entrega' : 'Entregar tarea' }}
                      </button>
                      <button mat-button type="button" (click)="abierta.set(null)">Cancelar</button>
                    </div>
                  </form>
                } @else {
                  <button mat-flat-button class="boton-institucional" type="button" (click)="abrir(act)">
                    <mat-icon aria-hidden="true">send</mat-icon>
                    {{ act.miEntrega?.entregadaEn ? 'Cambiar mi entrega' : 'Entregar' }}
                  </button>
                }
              }
            </li>
          } @empty {
            <li class="tarjeta vacio">
              {{ filtro() === 'pendientes' ? 'No hay tareas pendientes. ¡Al día!' : 'Los docentes aún no han publicado actividades.' }}
            </li>
          }
        </ul>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando aula virtual" />
      }
    </div>
  `,
  styles: `
    .resumen {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.6rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        padding: 0.75rem 0.4rem;
        text-align: center;
        font-size: 0.85rem;
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.8rem;
      }
    }

    .filtro {
      margin-block-end: 1rem;
    }

    .actividades {
      display: grid;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .actividad.tarea {
      border-inline-start: 4px solid var(--jv-amarillo);
    }

    .cabecera {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;

      > mat-icon {
        color: var(--jv-azul-medio);
      }

      div {
        flex: 1;
      }

      h2 {
        margin: 0;
        color: var(--jv-azul);
        font-size: 1.05rem;
      }

      p {
        margin: 0.15rem 0 0;
        font-size: 0.88rem;
      }
    }

    .fecha {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 600;
    }

    .entrega {
      margin-block-start: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--jv-superficie-suave);
      border-radius: var(--jv-radio);

      p {
        margin: 0.4rem 0 0;
      }
    }

    .nota strong {
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .formulario-entrega {
      display: grid;
      gap: 0.5rem;
      margin-block-start: 0.75rem;
    }

    .subir {
      cursor: pointer;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }
  `,
})
export class AulaCampusComponent {
  readonly #servicio = inject(CampusMejorasService);
  readonly #campus = inject(CampusService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly esEstudiante = this.#campus.esEstudiante;
  protected readonly estudianteId = signal<string | null>(null);
  protected readonly aula = signal<AulaEstudiante | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly filtro = signal<Filtro>('pendientes');
  protected readonly abierta = signal<string | null>(null);
  protected readonly archivo = signal<ArchivoAula | null>(null);
  protected readonly enviando = signal(false);
  protected texto = '';
  protected enlace = '';
  protected readonly tipos = TIPOS_ARCHIVO_AULA;
  protected readonly icono = iconoArchivo;
  protected readonly tamano = tamanoLegible;
  protected readonly nota = formatoNota;

  protected readonly conteo = computed(() => {
    const lista = this.aula()?.actividades ?? [];
    return {
      pendientes: lista.filter((a) => pendiente(a)).length,
      entregadas: lista.filter((a) => a.miEntrega?.entregadaEn).length,
      material: lista.filter((a) => a.tipo === 'Material').length,
    };
  });

  protected readonly visibles = computed(() => {
    const lista = this.aula()?.actividades ?? [];
    switch (this.filtro()) {
      case 'pendientes':
        return lista.filter((a) => pendiente(a));
      case 'material':
        return lista.filter((a) => a.tipo === 'Material');
      default:
        return lista;
    }
  });

  constructor() {
    effect(() => {
      const id = this.estudianteId();
      if (this.esEstudiante() || id) {
        void this.#cargar(id);
      }
    });
  }

  protected estado(act: Actividad): EstadoActividad | null {
    if (act.tipo === 'Material') {
      return { texto: 'Material', tono: '' };
    }
    const entrega = act.miEntrega;
    if (entrega?.nota !== null && entrega?.nota !== undefined) {
      return { texto: `Calificada ${formatoNota(entrega.nota)}`, tono: entrega.nota >= 3 ? 'ok' : 'peligro' };
    }
    if (entrega?.entregadaEn) {
      return { texto: entrega.tarde ? 'Entregada tarde' : 'Entregada', tono: 'ok' };
    }
    if (act.fechaEntrega && Date.parse(act.fechaEntrega) < Date.now()) {
      return { texto: 'Vencida', tono: 'peligro' };
    }
    return { texto: 'Pendiente', tono: 'alerta' };
  }

  protected abrir(act: Actividad): void {
    this.texto = act.miEntrega?.texto ?? '';
    this.enlace = act.miEntrega?.enlace ?? '';
    this.archivo.set(act.miEntrega?.archivo ?? null);
    this.abierta.set(act.id);
  }

  protected async adjuntar(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) {
      return;
    }
    const problema = archivoValido(archivo);
    if (problema) {
      this.#snackBar.open(problema, 'Cerrar');
      return;
    }
    try {
      this.archivo.set(await this.#servicio.subirArchivo(archivo));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async entregar(act: Actividad): Promise<void> {
    this.enviando.set(true);
    try {
      const actualizada = await this.#servicio.entregar(act.id, {
        texto: this.texto.trim() || null,
        enlace: this.enlace.trim() || null,
        archivoId: this.archivo()?.id ?? null,
      });
      this.aula.update((a) => (a ? { ...a, actividades: a.actividades.map((x) => (x.id === act.id ? actualizada : x)) } : a));
      this.abierta.set(null);
      this.#snackBar.open('Tarea entregada. Su docente ya la puede revisar.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.enviando.set(false);
    }
  }

  protected async descargar(archivo: ArchivoAula): Promise<void> {
    try {
      await descargarArchivoAula(this.#servicio, archivo);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  async #cargar(estudianteId: string | null): Promise<void> {
    this.error.set(null);
    try {
      this.aula.set(await this.#servicio.miAula(this.esEstudiante() ? null : estudianteId));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}

function pendiente(act: Actividad): boolean {
  return act.tipo === 'Tarea' && !act.miEntrega?.entregadaEn && (act.miEntrega?.nota ?? null) === null;
}

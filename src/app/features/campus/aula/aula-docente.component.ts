import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';

import { CursoDocente, Periodo } from '../../../core/models/academico.model';
import { nombreGrado } from '../../../core/models/campus.model';
import {
  Actividad,
  ArchivoAula,
  Entrega,
  EntregasActividad,
  GuardarActividad,
  TIPOS_ARCHIVO_AULA,
  TipoActividad,
  tamanoLegible,
} from '../../../core/models/mejoras.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusMejorasService } from '../../../core/services/mejoras.service';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { archivoValido, descargarArchivoAula, iconoArchivo } from './archivo-aula';

interface Borrador {
  tipo: TipoActividad;
  periodoId: string;
  titulo: string;
  descripcion: string;
  enlace: string;
  fecha: Date | null;
  hora: string;
  calificable: boolean;
}

interface FilaCalificacion {
  readonly entrega: Entrega;
  nota: number | null;
  comentario: string;
}

/**
 * Aula virtual de una clase para el docente: publica material y tareas, revisa las entregas, las califica y
 * pasa el promedio de las tareas a la planilla de notas del periodo.
 */
@Component({
  selector: 'app-aula-docente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    EncabezadoCampusComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        [titulo]="'Aula virtual · ' + titulo()"
        subtitulo="Material, tareas y calificación de entregas"
        icono="auto_stories"
        [volverA]="['/campus/docente', asignacionId()]"
        textoVolver="Planilla de la clase"
      >
        <button mat-flat-button class="boton-institucional" type="button" (click)="nueva()">
          <mat-icon aria-hidden="true">add</mat-icon>
          Publicar
        </button>
      </app-encabezado-campus>

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (borrador(); as b) {
        <form class="tarjeta" (ngSubmit)="guardar()">
          <h2>{{ editandoId() ? 'Editar actividad' : 'Nueva actividad' }}</h2>
          <div class="formulario-rejilla">
            <mat-form-field>
              <mat-label>Tipo</mat-label>
              <mat-select name="tipo" [(ngModel)]="b.tipo">
                <mat-option value="Tarea">Tarea (los estudiantes entregan)</mat-option>
                <mat-option value="Material">Material de clase</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Periodo</mat-label>
              <mat-select name="periodo" [(ngModel)]="b.periodoId" required>
                @for (p of periodos(); track p.id) {
                  <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="ancho-completo">
              <mat-label>Título</mat-label>
              <input matInput name="titulo" maxlength="150" required [(ngModel)]="b.titulo" />
            </mat-form-field>
            <mat-form-field class="ancho-completo">
              <mat-label>Instrucciones</mat-label>
              <textarea matInput name="descripcion" rows="4" maxlength="4000" [(ngModel)]="b.descripcion"></textarea>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Enlace (opcional)</mat-label>
              <input matInput name="enlace" type="url" maxlength="500" [(ngModel)]="b.enlace" />
            </mat-form-field>
            @if (b.tipo === 'Tarea') {
              <mat-form-field>
                <mat-label>Fecha de entrega</mat-label>
                <input matInput name="fecha" [matDatepicker]="selector" [(ngModel)]="b.fecha" />
                <mat-datepicker-toggle matIconSuffix [for]="selector" />
                <mat-datepicker #selector />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Hora límite</mat-label>
                <input matInput name="hora" type="time" [(ngModel)]="b.hora" />
              </mat-form-field>
              <mat-checkbox name="calificable" [(ngModel)]="b.calificable">Calificable (cuenta para la nota del periodo)</mat-checkbox>
            }
          </div>
          <div class="acciones-fila">
            <label mat-stroked-button class="subir">
              <mat-icon aria-hidden="true">upload_file</mat-icon>
              {{ archivo()?.nombreArchivo ?? 'Adjuntar guía o archivo (5 MB)' }}
              <input type="file" [accept]="tipos" (change)="adjuntar($event)" hidden />
            </label>
            @if (archivo()) {
              <button mat-button type="button" (click)="archivo.set(null)">Quitar archivo</button>
            }
            <span class="espacio"></span>
            <button mat-button type="button" (click)="borrador.set(null)">Cancelar</button>
            <button mat-flat-button class="boton-institucional" type="submit" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : editandoId() ? 'Guardar cambios' : 'Publicar y avisar' }}
            </button>
          </div>
        </form>
      }

      @if (periodoAbierto(); as p) {
        <div class="tarjeta planilla">
          <mat-icon aria-hidden="true">table_view</mat-icon>
          <p>
            Pase el promedio de las tareas calificables de <strong>{{ p.nombre }}</strong> a la planilla de notas. Solo
            reemplaza la nota de quienes tengan tareas calificadas.
          </p>
          <button mat-stroked-button type="button" [disabled]="pasando()" (click)="pasarAPlanilla(p)">Pasar a la planilla</button>
        </div>
      }

      @if (actividades(); as lista) {
        <ul class="actividades">
          @for (act of lista; track act.id) {
            <li class="tarjeta">
              <div class="cabecera">
                <mat-icon aria-hidden="true">{{ act.tipo === 'Tarea' ? 'assignment' : 'menu_book' }}</mat-icon>
                <div>
                  <h3>{{ act.titulo }}</h3>
                  <p class="texto-suave">
                    {{ act.tipo }} · {{ nombrePeriodo(act.periodoId) }} · publicada {{ act.creadoEn | date: 'd MMM' }}
                    @if (act.fechaEntrega) { · entrega {{ act.fechaEntrega | date: "d MMM, h:mm a" }} }
                  </p>
                </div>
                @if (act.tipo === 'Tarea') {
                  <span class="etiqueta-estado" [attr.data-tono]="act.entregas < act.estudiantes ? 'alerta' : 'ok'">
                    {{ act.entregas }}/{{ act.estudiantes }} entregas · {{ act.calificadas }} calificadas
                  </span>
                }
              </div>
              @if (act.descripcion) {
                <p class="pre-linea">{{ act.descripcion }}</p>
              }
              <div class="acciones-fila">
                @if (act.enlace) {
                  <a mat-button [href]="act.enlace" target="_blank" rel="noopener"><mat-icon aria-hidden="true">link</mat-icon> Enlace</a>
                }
                @if (act.archivo; as f) {
                  <button mat-button type="button" (click)="descargar(f)"><mat-icon aria-hidden="true">{{ icono(f) }}</mat-icon> {{ f.nombreArchivo }} ({{ tamano(f.tamano) }})</button>
                }
                <span class="espacio"></span>
                @if (act.tipo === 'Tarea') {
                  <button mat-stroked-button type="button" (click)="verEntregas(act)">
                    <mat-icon aria-hidden="true">grading</mat-icon> {{ revisando()?.actividad?.id === act.id ? 'Ocultar entregas' : 'Revisar entregas' }}
                  </button>
                }
                <button mat-button type="button" (click)="editar(act)">Editar</button>
                <button mat-button type="button" class="peligro" (click)="eliminar(act)">Eliminar</button>
              </div>

              @if (revisando(); as r) {
                @if (r.actividad.id === act.id) {
                  <div class="tabla-desplazable">
                    <table class="tabla-datos">
                      <thead>
                        <tr><th scope="col">Estudiante</th><th scope="col">Entrega</th><th scope="col">Nota</th><th scope="col">Comentario</th></tr>
                      </thead>
                      <tbody>
                        @for (f of filas(); track f.entrega.estudianteId) {
                          <tr>
                            <td>{{ f.entrega.estudiante }}</td>
                            <td>
                              @if (f.entrega.entregadaEn) {
                                <span class="etiqueta-estado" [attr.data-tono]="f.entrega.tarde ? 'alerta' : 'ok'">
                                  {{ f.entrega.entregadaEn | date: 'd MMM, h:mm a' }}{{ f.entrega.tarde ? ' · tarde' : '' }}
                                </span>
                                @if (f.entrega.texto) { <p class="pre-linea">{{ f.entrega.texto }}</p> }
                                @if (f.entrega.enlace) { <a [href]="f.entrega.enlace" target="_blank" rel="noopener">Abrir enlace</a> }
                                @if (f.entrega.archivo; as fa) {
                                  <button mat-button type="button" (click)="descargar(fa)"><mat-icon aria-hidden="true">attach_file</mat-icon> {{ fa.nombreArchivo }}</button>
                                }
                              } @else {
                                <span class="texto-suave">Sin entregar</span>
                              }
                            </td>
                            <td>
                              <input class="nota" type="number" min="1" max="5" step="0.1" [attr.aria-label]="'Nota de ' + f.entrega.estudiante" [(ngModel)]="f.nota" />
                            </td>
                            <td>
                              <input class="comentario" type="text" maxlength="500" [attr.aria-label]="'Comentario para ' + f.entrega.estudiante" [(ngModel)]="f.comentario" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <div class="acciones-fila guardar">
                    <button mat-flat-button class="boton-institucional" type="button" [disabled]="guardando()" (click)="calificar(act)">
                      Guardar calificaciones
                    </button>
                  </div>
                }
              }
            </li>
          } @empty {
            <li class="tarjeta vacio">Aún no ha publicado material ni tareas en esta clase.</li>
          }
        </ul>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando actividades" />
      }

      <p class="texto-suave"><a [routerLink]="['/campus/docente', asignacionId(), 'recuperaciones']">Recuperaciones de esta clase</a></p>
    </div>
  `,
  styles: `
    h2 {
      margin-block-start: 0;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    form.tarjeta {
      margin-block-end: 1rem;
    }

    .planilla {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block-end: 1rem;

      p {
        flex: 1 1 280px;
        margin: 0;
      }
    }

    .actividades {
      display: grid;
      gap: 1rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
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

      h3 {
        margin: 0;
        color: var(--jv-azul);
      }

      p {
        margin: 0.15rem 0 0;
        font-size: 0.88rem;
      }
    }

    .espacio {
      flex: 1;
    }

    .subir {
      cursor: pointer;
    }

    .peligro {
      color: var(--jv-rojo);
    }

    .nota {
      inline-size: 4.5rem;
    }

    .comentario {
      inline-size: 100%;
      min-inline-size: 10rem;
    }

    input.nota,
    input.comentario {
      padding: 0.35rem;
      border: 1px solid var(--jv-borde);
      border-radius: 6px;
      font: inherit;
    }

    .guardar {
      justify-content: flex-end;
      margin-block-start: 0.75rem;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }
  `,
})
export class AulaDocenteComponent implements OnInit {
  readonly asignacionId = input.required<string>();

  readonly #academico = inject(CampusAcademicoService);
  readonly #servicio = inject(CampusMejorasService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly clase = signal<CursoDocente | null>(null);
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly actividades = signal<Actividad[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly borrador = signal<Borrador | null>(null);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly archivo = signal<ArchivoAula | null>(null);
  protected readonly guardando = signal(false);
  protected readonly pasando = signal(false);
  protected readonly revisando = signal<EntregasActividad | null>(null);
  protected readonly filas = signal<FilaCalificacion[]>([]);
  protected readonly tipos = TIPOS_ARCHIVO_AULA;
  protected readonly icono = iconoArchivo;
  protected readonly tamano = tamanoLegible;

  protected readonly titulo = computed(() => {
    const c = this.clase();
    return c ? `${c.asignatura} · ${nombreGrado(c.grado)} ${c.grupo ?? ''}`.trim() : 'Clase';
  });
  protected readonly periodoAbierto = computed(() => this.periodos().find((p) => p.notasAbiertas) ?? null);

  async ngOnInit(): Promise<void> {
    try {
      const datos = await this.#academico.misCursos();
      const clase = datos.cursos.find((c) => c.asignacionId === this.asignacionId()) ?? null;
      if (!clase) {
        this.error.set('Esta clase no está en su carga académica.');
        return;
      }
      this.clase.set(clase);
      this.periodos.set([...datos.periodos]);
      this.actividades.set(await this.#servicio.actividadesClase(this.asignacionId()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected nombrePeriodo(id: string): string {
    return this.periodos().find((p) => p.id === id)?.nombre ?? '';
  }

  protected nueva(): void {
    const hoy = new Date();
    const periodo = this.periodos().find((p) => p.inicio <= aFechaIso(hoy) && aFechaIso(hoy) <= p.fin) ?? this.periodoAbierto();
    this.editandoId.set(null);
    this.archivo.set(null);
    this.borrador.set({
      tipo: 'Tarea',
      periodoId: periodo?.id ?? this.periodos()[0]?.id ?? '',
      titulo: '',
      descripcion: '',
      enlace: '',
      fecha: null,
      hora: '23:59',
      calificable: true,
    });
  }

  protected editar(act: Actividad): void {
    const fecha = act.fechaEntrega ? new Date(act.fechaEntrega) : null;
    this.editandoId.set(act.id);
    this.archivo.set(act.archivo);
    this.borrador.set({
      tipo: act.tipo,
      periodoId: act.periodoId,
      titulo: act.titulo,
      descripcion: act.descripcion ?? '',
      enlace: act.enlace ?? '',
      fecha: fecha ? desdeFechaIso(aFechaIso(fecha)) : null,
      hora: fecha ? `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}` : '23:59',
      calificable: act.calificable,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  protected async guardar(): Promise<void> {
    const b = this.borrador();
    if (!b || !b.titulo.trim() || !b.periodoId) {
      this.#snackBar.open('Escriba el título y elija el periodo.', 'Cerrar');
      return;
    }
    const cuerpo: GuardarActividad = {
      tipo: b.tipo,
      periodoId: b.periodoId,
      titulo: b.titulo.trim(),
      descripcion: b.descripcion.trim() || null,
      enlace: b.enlace.trim() || null,
      archivoId: this.archivo()?.id ?? null,
      // Hora de Colombia (UTC-5, sin horario de verano).
      fechaEntrega: b.tipo === 'Tarea' && b.fecha ? `${aFechaIso(b.fecha)}T${b.hora || '23:59'}:00-05:00` : null,
      calificable: b.tipo === 'Tarea' && b.calificable,
    };
    this.guardando.set(true);
    try {
      const id = this.editandoId();
      const guardada = id
        ? await this.#servicio.actualizarActividad(id, cuerpo)
        : await this.#servicio.crearActividad(this.asignacionId(), cuerpo);
      this.actividades.update((lista) => (id ? (lista ?? []).map((a) => (a.id === id ? guardada : a)) : [guardada, ...(lista ?? [])]));
      this.borrador.set(null);
      this.#snackBar.open(id ? 'Actividad actualizada.' : 'Publicada. Los estudiantes y acudientes recibieron el aviso.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async eliminar(act: Actividad): Promise<void> {
    if (!confirm(`¿Eliminar "${act.titulo}"? También se borran las entregas de los estudiantes.`)) {
      return;
    }
    try {
      await this.#servicio.eliminarActividad(act.id);
      this.actividades.update((lista) => (lista ?? []).filter((a) => a.id !== act.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async verEntregas(act: Actividad): Promise<void> {
    if (this.revisando()?.actividad.id === act.id) {
      this.revisando.set(null);
      return;
    }
    try {
      this.#mostrar(await this.#servicio.entregas(act.id));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async calificar(act: Actividad): Promise<void> {
    const notas = this.filas();
    if (notas.some((f) => f.nota !== null && (f.nota < 1 || f.nota > 5))) {
      this.#snackBar.open('Las notas van de 1,0 a 5,0.', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      const resultado = await this.#servicio.calificar(
        act.id,
        notas.map((f) => ({ estudianteId: f.entrega.estudianteId, nota: f.nota, comentario: f.comentario.trim() || null })),
      );
      this.#mostrar(resultado);
      this.actividades.update((lista) => (lista ?? []).map((a) => (a.id === act.id ? resultado.actividad : a)));
      this.#snackBar.open('Calificaciones guardadas y enviadas a las familias.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  protected async pasarAPlanilla(periodo: Periodo): Promise<void> {
    this.pasando.set(true);
    try {
      const r = await this.#servicio.pasarAPlanilla(this.asignacionId(), periodo.id);
      this.#snackBar.open(
        r.actualizadas
          ? `Se actualizaron ${r.actualizadas} notas en la planilla con ${r.tareas.length} tareas (${r.sinNotas} estudiantes sin tareas calificadas).`
          : 'No hay tareas calificables con notas en este periodo.',
        'Cerrar',
      );
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.pasando.set(false);
    }
  }

  protected async descargar(archivo: ArchivoAula): Promise<void> {
    try {
      await descargarArchivoAula(this.#servicio, archivo);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  #mostrar(entregas: EntregasActividad): void {
    this.revisando.set(entregas);
    this.filas.set(entregas.filas.map((e) => ({ entrega: e, nota: e.nota, comentario: e.comentario ?? '' })));
  }
}

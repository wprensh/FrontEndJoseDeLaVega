import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { Asignacion, PersonaResumen } from '../../../core/models/academico.model';
import {
  BloqueHorario,
  DIAS_SEMANA,
  HORAS_SEMANALES_DOCENTE,
  Horario,
  colorDe,
  horaLegible,
  nombreCurso,
} from '../../../core/models/horario.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  HorarioSemanalComponent,
  MoverClase,
  SoltarClase,
} from '../../../shared/horario/horario-semanal.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

interface CursoOpcion {
  readonly clave: string;
  readonly grado: number;
  readonly grupo: string | null;
}

/**
 * Horario semanal por docente o por curso. Las clases de la carga docente se arrastran al calendario;
 * el servidor rechaza los cruces de docente y de curso.
 */
@Component({
  selector: 'app-horarios-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    HorarioSemanalComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        class="no-imprimir"
        titulo="Horarios"
        subtitulo="Arrastre las clases de la carga docente al calendario. No se permiten cruces de docente ni de curso."
        etiqueta="Académico"
      />

      <section class="tarjeta filtros no-imprimir" aria-label="Qué horario ver">
        <mat-button-toggle-group [value]="vista()" (change)="cambiarVista($event.value)" aria-label="Ver horario por">
          <mat-button-toggle value="docente"><mat-icon>person</mat-icon> Por docente</mat-button-toggle>
          <mat-button-toggle value="curso"><mat-icon>groups</mat-icon> Por curso</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field subscriptSizing="dynamic" class="anio">
          <mat-label>Año lectivo</mat-label>
          <mat-select [value]="anio()" (selectionChange)="cambiarAnio($event.value)">
            @for (a of anios; track a) {
              <mat-option [value]="a">{{ a }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (vista() === 'docente') {
          <mat-form-field subscriptSizing="dynamic" class="seleccion">
            <mat-label>Docente</mat-label>
            <mat-select [value]="docenteId()" (selectionChange)="elegirDocente($event.value)">
              @for (d of docentes(); track d.id) {
                <mat-option [value]="d.id">{{ d.nombreCompleto }} · {{ d.documento }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        } @else {
          <mat-form-field subscriptSizing="dynamic" class="seleccion">
            <mat-label>Curso</mat-label>
            <mat-select [value]="cursoClave()" (selectionChange)="elegirCurso($event.value)">
              @for (c of cursos(); track c.clave) {
                <mat-option [value]="c.clave">{{ nombreCurso(c.grado, c.grupo) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (puedeCrear()) {
          <mat-form-field subscriptSizing="dynamic" class="duracion">
            <mat-label>Duración de la clase</mat-label>
            <mat-select [(ngModel)]="duracion">
              <mat-option [value]="45">45 minutos</mat-option>
              <mat-option [value]="50">50 minutos</mat-option>
              <mat-option [value]="55">55 minutos</mat-option>
              <mat-option [value]="60">1 hora</mat-option>
              <mat-option [value]="120">2 horas</mat-option>
            </mat-select>
          </mat-form-field>
        }

        <button mat-stroked-button type="button" (click)="imprimir()" [disabled]="!horario()">
          <mat-icon>print</mat-icon> Imprimir
        </button>
      </section>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando horario" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (horario(); as h) {
        <h2 class="titulo-impresion">Horario {{ anio() }} · {{ tituloSeleccion() }}</h2>

        <div class="distribucion">
          <aside class="tarjeta clases no-imprimir" aria-labelledby="titulo-clases">
            <h2 id="titulo-clases">Carga {{ vista() === 'docente' ? 'del docente' : 'del curso' }}</h2>
            <p class="total" [class.completo]="totalProgramado() >= totalMeta() && totalMeta() > 0">
              <strong>{{ totalProgramado() | number: '1.0-1' }}</strong> de {{ totalMeta() }} h programadas
            </p>
            @if (vista() === 'docente') {
              <p class="referencia">
                Referencia: {{ horasDocente }} h semanales de clase por docente de secundaria y media
                (Decreto 1850 de 2002).
              </p>
            }
            @if (puedeCrear()) {
              <p class="ayuda"><mat-icon aria-hidden="true">drag_indicator</mat-icon> Arrastre una clase al día y la hora.</p>
            }

            @if (h.asignaciones.length) {
              <ul #origen>
                @for (a of h.asignaciones; track a.asignacion.id) {
                  <li
                    class="clase-pendiente"
                    [class.arrastrable]="puedeCrear()"
                    [class.completa]="completa(a.asignacion, a.horasProgramadas)"
                    [attr.data-asignacion]="puedeCrear() ? a.asignacion.id : null"
                    [attr.data-titulo]="etiqueta(a.asignacion)"
                    [style.--color]="color(a.asignacion)"
                  >
                    <span class="nombre">{{ etiqueta(a.asignacion) }}</span>
                    <span class="detalle">{{ detalle(a.asignacion) }}</span>
                    <span class="horas">
                      {{ a.horasProgramadas | number: '1.0-1' }} / {{ a.asignacion.intensidadHoraria ?? '–' }} h
                    </span>
                  </li>
                }
              </ul>
            } @else {
              <p class="vacio">
                {{ vista() === 'docente' ? 'Este docente' : 'Este curso' }} no tiene carga en {{ anio() }}.
                Asígnela en Académico → Carga docente.
              </p>
            }
          </aside>

          <section class="tarjeta calendario" aria-label="Horario semanal">
            <app-horario-semanal
              [bloques]="h.bloques"
              [vista]="vista()"
              [editable]="puedeEditar()"
              [puedeEliminar]="puedeEliminar()"
              [origenArrastre]="origen()"
              [duracionMinutos]="duracion"
              [primeraHora]="rango().desde"
              [ultimaHora]="rango().hasta"
              (soltar)="crear($event)"
              (mover)="mover($event)"
              (eliminar)="quitar($event)"
            />
          </section>
        </div>
      } @else if (!cargando() && !error()) {
        <p class="tarjeta vacio">Elija un {{ vista() === 'docente' ? 'docente' : 'curso' }} para ver su horario.</p>
      }
    </div>
  `,
  styles: `
    .filtros {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1rem;
      margin-block-end: 1.25rem;

      .anio { inline-size: 9rem; }
      .seleccion { flex: 1 1 18rem; }
      .duracion { inline-size: 12rem; }
    }

    .distribucion {
      display: grid;
      grid-template-columns: minmax(15rem, 19rem) 1fr;
      gap: 1.25rem;
      align-items: start;
      margin-block-start: 1rem;
    }

    .clases {
      position: sticky;
      inset-block-start: 1rem;
      padding: 1rem;

      h2 { font-size: 1.05rem; margin: 0 0 0.35rem; }
      ul { display: grid; gap: 0.45rem; margin: 0.75rem 0 0; padding: 0; list-style: none; }
    }

    .total {
      margin: 0;
      color: var(--jv-texto-suave);
      strong { color: var(--jv-azul); font-size: 1.35rem; }
      &.completo strong { color: #15803d; }
    }

    .referencia, .ayuda {
      margin: 0.35rem 0 0;
      font-size: 0.8rem;
      color: var(--jv-texto-suave);
    }

    .ayuda {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      mat-icon { font-size: 1.1rem; inline-size: 1.1rem; block-size: 1.1rem; }
    }

    .clase-pendiente {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0 0.5rem;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--jv-borde);
      border-inline-start: 5px solid var(--color);
      border-radius: 8px;
      background: var(--jv-superficie);

      &.arrastrable { cursor: grab; }
      &.arrastrable:hover { box-shadow: var(--jv-sombra); }
      &.completa { background: var(--jv-superficie-suave); }
      &.completa .horas { color: #15803d; }

      .nombre { font-weight: 700; color: var(--jv-azul); }
      .detalle { grid-column: 1; font-size: 0.8rem; color: var(--jv-texto-suave); }
      .horas { grid-row: 1 / span 2; grid-column: 2; align-self: center; font-weight: 700; font-size: 0.85rem; }
    }

    .calendario { padding: 0.75rem; overflow-x: auto; }
    .calendario app-horario-semanal { min-inline-size: 640px; }

    .vacio { color: var(--jv-texto-suave); }
    .aviso-error { color: var(--jv-rojo); }
    .titulo-impresion { display: none; }

    @media (max-width: 900px) {
      .distribucion { grid-template-columns: 1fr; }
      .clases { position: static; }
    }

    @media print {
      .distribucion { display: block; }
      .tarjeta.calendario { border: 0; padding: 0; }
      .titulo-impresion { display: block; margin: 0 0 0.75rem; font-size: 1.2rem; }
    }
  `,
})
export class HorariosAdminComponent implements OnInit {
  readonly #servicio = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #dialog = inject(MatDialog);
  readonly #sesion = inject(SesionService);

  protected readonly nombreCurso = nombreCurso;
  protected readonly horasDocente = HORAS_SEMANALES_DOCENTE;
  protected readonly anios = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1];

  protected readonly vista = signal<'docente' | 'curso'>('docente');
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly docentes = signal<PersonaResumen[]>([]);
  protected readonly cursos = signal<CursoOpcion[]>([]);
  protected readonly docenteId = signal<string | null>(null);
  protected readonly cursoClave = signal<string | null>(null);
  protected readonly horario = signal<Horario | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly listaClases = viewChild<ElementRef<HTMLElement>>('origen');
  protected readonly origen = computed(() => this.listaClases()?.nativeElement ?? null);
  protected duracion = 60;

  protected readonly puedeCrear = computed(() => this.#sesion.puede('Academico', 'Crear'));
  protected readonly puedeEditar = computed(() => this.#sesion.puede('Academico', 'Editar') || this.puedeCrear());
  protected readonly puedeEliminar = computed(() => this.#sesion.puede('Academico', 'Eliminar'));

  protected readonly totalProgramado = computed(() =>
    (this.horario()?.asignaciones ?? []).reduce((s, a) => s + a.horasProgramadas, 0),
  );
  protected readonly totalMeta = computed(() =>
    (this.horario()?.asignaciones ?? []).reduce((s, a) => s + (a.asignacion.intensidadHoraria ?? 0), 0),
  );

  /** De 6:00 a. m. a 6:00 p. m., ampliado a la hora entera si hay clases más temprano o más tarde. */
  protected readonly rango = computed(() => {
    const bloques = this.horario()?.bloques ?? [];
    const horas = (h: string) => Number(h.slice(0, 2)) + Number(h.slice(3, 5)) / 60;
    const desde = Math.floor(Math.min(6, ...bloques.map((b) => horas(b.inicio))));
    const hasta = Math.ceil(Math.max(18, ...bloques.map((b) => horas(b.fin))));
    const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;
    return { desde: hora(desde), hasta: hora(hasta) };
  });

  protected readonly tituloSeleccion = computed(() => {
    if (this.vista() === 'docente') {
      return this.docentes().find((d) => d.id === this.docenteId())?.nombreCompleto ?? '';
    }
    const c = this.cursos().find((x) => x.clave === this.cursoClave());
    return c ? nombreCurso(c.grado, c.grupo) : '';
  });

  async ngOnInit(): Promise<void> {
    try {
      const [docentes, cursos, carga] = await Promise.all([
        this.#servicio.docentes(),
        this.#servicio.cursos(),
        this.#servicio.asignaciones(this.anio()),
      ]);
      this.docentes.set(docentes);
      this.#armarCursos(cursos.map((c) => ({ grado: c.grado, grupo: c.grupo })), carga);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected cambiarVista(vista: 'docente' | 'curso'): void {
    this.vista.set(vista);
    void this.cargar();
  }

  protected async cambiarAnio(anio: number): Promise<void> {
    this.anio.set(anio);
    const carga = await this.#servicio.asignaciones(anio).catch(() => []);
    this.#armarCursos(this.cursos(), carga);
    await this.cargar();
  }

  protected elegirDocente(id: string): void {
    this.docenteId.set(id);
    void this.cargar();
  }

  protected elegirCurso(clave: string): void {
    this.cursoClave.set(clave);
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    const filtro = this.#filtro();
    if (!filtro) {
      this.horario.set(null);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.horario.set(await this.#servicio.horario(this.anio(), filtro));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async crear(c: SoltarClase): Promise<void> {
    try {
      await this.#servicio.crearBloque({ asignacionId: c.asignacionId, dia: c.dia, inicio: c.inicio, fin: c.fin });
      this.#snackBar.open(`Clase ubicada el ${DIAS_SEMANA[c.dia].toLowerCase()} a las ${horaLegible(c.inicio)}`, 'Cerrar', { duration: 3000 });
      await this.cargar();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar', { duration: 7000 });
    }
  }

  protected async mover(c: MoverClase): Promise<void> {
    try {
      await this.#servicio.moverBloque(c.bloqueId, { dia: c.dia, inicio: c.inicio, fin: c.fin });
      await this.cargar();
    } catch (error) {
      c.deshacer();
      this.#snackBar.open(mensajeDeError(error), 'Cerrar', { duration: 7000 });
    }
  }

  protected async quitar(b: BloqueHorario): Promise<void> {
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Quitar la clase del horario',
            mensaje: `${b.asignatura} con ${nombreCurso(b.grado, b.grupo)}, ${DIAS_SEMANA[b.dia].toLowerCase()} de ` +
              `${horaLegible(b.inicio)} a ${horaLegible(b.fin)}. La carga docente no cambia.`,
            confirmar: 'Quitar',
          },
        })
        .afterClosed(),
    );
    if (!confirmado) {
      return;
    }
    try {
      await this.#servicio.eliminarBloque(b.id);
      await this.cargar();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar', { duration: 7000 });
    }
  }

  protected imprimir(): void {
    window.print();
  }

  protected etiqueta(a: Asignacion): string {
    return this.vista() === 'docente' ? nombreCurso(a.grado, a.grupo) : a.asignatura;
  }

  protected detalle(a: Asignacion): string {
    return this.vista() === 'docente' ? a.asignatura : a.docenteNombre;
  }

  protected color(a: Asignacion): string {
    return colorDe(this.etiqueta(a));
  }

  protected completa(a: Asignacion, horas: number): boolean {
    return a.intensidadHoraria !== null && horas >= a.intensidadHoraria;
  }

  #filtro(): { docenteId?: string; grado?: number; grupo?: string | null } | null {
    if (this.vista() === 'docente') {
      const id = this.docenteId();
      return id ? { docenteId: id } : null;
    }
    const c = this.cursos().find((x) => x.clave === this.cursoClave());
    return c ? { grado: c.grado, grupo: c.grupo } : null;
  }

  /** Cursos con estudiantes más los que ya tienen carga en el año, ordenados por grado y grupo. */
  #armarCursos(base: readonly { grado: number; grupo: string | null }[], carga: readonly Asignacion[]): void {
    const mapa = new Map<string, CursoOpcion>();
    for (const c of [...base, ...carga.map((a) => ({ grado: a.grado, grupo: a.grupo }))]) {
      const clave = `${c.grado}|${c.grupo ?? ''}`;
      mapa.set(clave, { clave, grado: c.grado, grupo: c.grupo });
    }
    this.cursos.set(
      [...mapa.values()].sort((a, b) => a.grado - b.grado || (a.grupo ?? '').localeCompare(b.grupo ?? '')),
    );
  }
}

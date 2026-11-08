import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import {
  Asignacion,
  Asignatura,
  Boletin,
  Consolidado,
  Curso,
  NOTA_APROBATORIA,
  Periodo,
  PersonaResumen,
  ReporteAsistencia,
  formatoNota,
} from '../../../core/models/academico.model';
import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { SesionService } from '../../../core/services/sesion.service';
import { descargarCsv } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { BoletinDocumentoComponent, imprimirBoletines } from '../../../shared/boletin-documento/boletin-documento.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

interface FormPeriodo {
  id: string | null;
  numero: number;
  nombre: string;
  inicio: string;
  fin: string;
  porcentaje: number;
  notasAbiertas: boolean;
  publicado: boolean;
}

interface FormAsignatura {
  id: string | null;
  nombre: string;
  area: string;
  orden: number;
  activa: boolean;
}

/**
 * Módulo Académico: periodos (con apertura de notas y publicación de boletines), asignaturas, carga docente,
 * consolidado de notas con boletines del curso para imprimir, y reporte de inasistencias.
 */
@Component({
  selector: 'app-academico-admin',
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
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    BarraAdminComponent,
    BoletinDocumentoComponent,
    PageHeadingComponent,
  ],
  templateUrl: './academico-admin.component.html',
  styleUrl: './academico-admin.component.scss',
})
export class AcademicoAdminComponent implements OnInit {
  readonly #servicio = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #dialog = inject(MatDialog);
  protected readonly sesion = inject(SesionService);

  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly formatoNota = formatoNota;
  protected readonly aprobatoria = NOTA_APROBATORIA;
  protected readonly anioActual = new Date().getFullYear();

  protected readonly anio = signal(this.anioActual);
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly asignaciones = signal<Asignacion[]>([]);
  protected readonly docentes = signal<PersonaResumen[]>([]);
  protected readonly cursos = signal<Curso[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly sumaPorcentajes = computed(() => this.periodos().reduce((s, p) => s + p.porcentaje, 0));

  // ---- Formularios ----
  protected formPeriodo: FormPeriodo | null = null;
  protected formAsignatura: FormAsignatura | null = null;
  protected readonly nuevaAsignacion = {
    docenteId: '',
    asignaturaId: '',
    grado: null as number | null,
    grupo: '',
    intensidadHoraria: null as number | null,
  };
  protected filtroCarga = { docenteId: '', grado: null as number | null };
  protected readonly guardando = signal(false);

  // ---- Reportes ----
  protected reporte = { periodoId: '', curso: '' };
  protected readonly consolidado = signal<Consolidado | null>(null);
  protected readonly boletines = signal<Boletin[] | null>(null);
  protected readonly cargandoReporte = signal(false);
  protected asistencia = { curso: '', desde: `${this.anioActual}-01-01`, hasta: '' };
  protected readonly reporteAsistencia = signal<ReporteAsistencia | null>(null);

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [periodos, asignaturas, asignaciones, docentes, cursos] = await Promise.all([
        this.#servicio.periodos(this.anio()),
        this.#servicio.asignaturas(),
        this.#servicio.asignaciones(this.anio()),
        this.#servicio.docentes(),
        this.#servicio.cursos(),
      ]);
      this.periodos.set([...periodos].sort((a, b) => a.numero - b.numero));
      this.asignaturas.set(asignaturas);
      this.asignaciones.set(asignaciones);
      this.docentes.set(docentes);
      this.cursos.set(cursos);
      if (!this.reporte.periodoId) {
        this.reporte.periodoId = this.periodos().find((p) => p.notasAbiertas)?.id ?? this.periodos().at(-1)?.id ?? '';
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected cambiarAnio(anio: number): void {
    this.anio.set(anio);
    this.reporte.periodoId = '';
    void this.recargar();
  }

  protected claveCurso(c: { grado: number; grupo: string | null }): string {
    return `${c.grado}|${c.grupo ?? ''}`;
  }

  protected nombreCurso(c: { grado: number; grupo: string | null }): string {
    return [nombreGrado(c.grado), c.grupo].filter(Boolean).join(' ');
  }

  // ================= Periodos =================

  protected nuevoPeriodo(): void {
    const ultimo = this.periodos().at(-1);
    const numero = (ultimo?.numero ?? 0) + 1;
    this.formPeriodo = {
      id: null,
      numero,
      nombre: '',
      inicio: '',
      fin: '',
      porcentaje: Math.max(0, 100 - this.sumaPorcentajes()) || 25,
      notasAbiertas: true,
      publicado: false,
    };
  }

  protected editarPeriodo(p: Periodo): void {
    this.formPeriodo = { ...p, id: p.id };
  }

  protected async guardarPeriodo(): Promise<void> {
    const f = this.formPeriodo;
    if (!f) {
      return;
    }
    await this.#guardar(async () => {
      const anterior = this.periodos().find((p) => p.id === f.id);
      await this.#servicio.guardarPeriodo(f.id, {
        anio: this.anio(),
        numero: f.numero,
        nombre: f.nombre.trim() || null,
        inicio: f.inicio,
        fin: f.fin,
        porcentaje: f.porcentaje,
        notasAbiertas: f.notasAbiertas,
        publicado: f.publicado,
      });
      this.formPeriodo = null;
      await this.recargar();
      return f.publicado && !anterior?.publicado
        ? 'Periodo guardado y boletines publicados: las familias reciben el aviso en el campus.'
        : 'Periodo guardado.';
    });
  }

  /** Cambio rápido desde la tabla: abrir/cerrar notas o publicar boletines. */
  protected async alternar(p: Periodo, campo: 'notasAbiertas' | 'publicado', valor: boolean): Promise<void> {
    if (campo === 'publicado' && valor) {
      const confirmado = await this.#confirmar(
        'Publicar boletines',
        `Los estudiantes y acudientes podrán ver los boletines de ${p.nombre} y recibirán un aviso. ¿Continuar?`,
        'Publicar',
      );
      if (!confirmado) {
        this.periodos.update((lista) => [...lista]);
        return;
      }
    }
    await this.#guardar(async () => {
      await this.#servicio.guardarPeriodo(p.id, { ...p, [campo]: valor });
      await this.recargar();
      return campo === 'publicado'
        ? valor
          ? 'Boletines publicados.'
          : 'Boletines ocultos para las familias.'
        : valor
          ? 'Notas abiertas: los docentes pueden registrar.'
          : 'Notas cerradas.';
    });
  }

  protected async eliminarPeriodo(p: Periodo): Promise<void> {
    if (await this.#confirmar('Eliminar periodo', `¿Eliminar ${p.nombre}? Solo se puede si no tiene notas.`, 'Eliminar')) {
      await this.#guardar(async () => {
        await this.#servicio.eliminarPeriodo(p.id);
        await this.recargar();
        return 'Periodo eliminado.';
      });
    }
  }

  // ================= Asignaturas =================

  protected nuevaAsignatura(): void {
    const orden = Math.max(0, ...this.asignaturas().map((a) => a.orden)) + 1;
    this.formAsignatura = { id: null, nombre: '', area: '', orden, activa: true };
  }

  protected editarAsignatura(a: Asignatura): void {
    this.formAsignatura = { ...a };
  }

  protected async guardarAsignatura(): Promise<void> {
    const f = this.formAsignatura;
    if (!f?.nombre.trim()) {
      return;
    }
    await this.#guardar(async () => {
      await this.#servicio.guardarAsignatura(f.id, {
        nombre: f.nombre.trim(),
        area: f.area.trim() || null,
        orden: f.orden,
        activa: f.activa,
      });
      this.formAsignatura = null;
      this.asignaturas.set(await this.#servicio.asignaturas());
      return 'Asignatura guardada.';
    });
  }

  protected async eliminarAsignatura(a: Asignatura): Promise<void> {
    if (await this.#confirmar('Eliminar asignatura', `¿Eliminar ${a.nombre}? Si ya tiene notas, desactívela.`, 'Eliminar')) {
      await this.#guardar(async () => {
        await this.#servicio.eliminarAsignatura(a.id);
        this.asignaturas.set(await this.#servicio.asignaturas());
        return 'Asignatura eliminada.';
      });
    }
  }

  // ================= Carga docente =================

  protected cargaVisible(): Asignacion[] {
    const { docenteId, grado } = this.filtroCarga;
    return this.asignaciones().filter((a) => (!docenteId || a.docenteId === docenteId) && (grado === null || a.grado === grado));
  }

  protected async agregarAsignacion(): Promise<void> {
    const n = this.nuevaAsignacion;
    if (!n.docenteId || !n.asignaturaId || n.grado === null) {
      this.#snackBar.open('Elija docente, asignatura y grado.', 'Cerrar');
      return;
    }
    await this.#guardar(async () => {
      const creada = await this.#servicio.crearAsignacion({
        anio: this.anio(),
        docenteId: n.docenteId,
        asignaturaId: n.asignaturaId,
        grado: n.grado!,
        grupo: n.grupo.trim() || null,
        intensidadHoraria: n.intensidadHoraria,
      });
      this.asignaciones.update((lista) => [...lista, creada]);
      n.asignaturaId = '';
      return `${creada.asignatura} de ${this.nombreCurso(creada)} asignada a ${creada.docenteNombre}.`;
    });
  }

  protected async cambiarDocente(a: Asignacion, docenteId: string): Promise<void> {
    await this.#guardar(async () => {
      const actualizada = await this.#servicio.actualizarAsignacion(a.id, docenteId, a.intensidadHoraria);
      this.asignaciones.update((lista) => lista.map((x) => (x.id === a.id ? actualizada : x)));
      return 'Docente actualizado.';
    });
  }

  protected async eliminarAsignacion(a: Asignacion): Promise<void> {
    await this.#guardar(async () => {
      await this.#servicio.eliminarAsignacion(a.id);
      this.asignaciones.update((lista) => lista.filter((x) => x.id !== a.id));
      return 'Asignación eliminada.';
    });
  }

  // ================= Consolidado y boletines =================

  protected async verConsolidado(): Promise<void> {
    const curso = this.#leerCurso(this.reporte.curso);
    if (!this.reporte.periodoId || !curso) {
      this.#snackBar.open('Elija el periodo y el curso.', 'Cerrar');
      return;
    }
    this.cargandoReporte.set(true);
    this.boletines.set(null);
    try {
      this.consolidado.set(await this.#servicio.consolidado(this.reporte.periodoId, curso.grado, curso.grupo));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoReporte.set(false);
    }
  }

  protected async prepararBoletines(): Promise<void> {
    const curso = this.#leerCurso(this.reporte.curso);
    if (!this.reporte.periodoId || !curso) {
      return;
    }
    this.cargandoReporte.set(true);
    try {
      this.boletines.set(await this.#servicio.boletinesCurso(this.reporte.periodoId, curso.grado, curso.grupo));
      queueMicrotask(() => document.getElementById('boletines-curso')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoReporte.set(false);
    }
  }

  protected imprimirBoletines(): void {
    imprimirBoletines();
  }

  protected descargarConsolidado(): void {
    const c = this.consolidado();
    if (!c) {
      return;
    }
    descargarCsv(
      `consolidado-${this.nombreCurso(c).replace(/\s+/g, '')}-${c.periodo.nombre.replace(/\s+/g, '-')}.csv`,
      ['Puesto', 'Estudiante', 'Documento', ...c.asignaturas.map((a) => a.nombre), 'Promedio', 'Perdidas'],
      c.filas.map((f) => [
        f.puesto ?? '',
        f.nombreCompleto,
        f.documento,
        ...f.notas.map((n) => (n === null ? '' : formatoNota(n))),
        f.promedio === null ? '' : formatoNota(f.promedio),
        f.asignaturasPerdidas,
      ]),
    );
  }

  // ================= Asistencia =================

  protected async verAsistencia(): Promise<void> {
    const curso = this.#leerCurso(this.asistencia.curso);
    if (!curso) {
      this.#snackBar.open('Elija el curso.', 'Cerrar');
      return;
    }
    this.cargandoReporte.set(true);
    try {
      this.reporteAsistencia.set(
        await this.#servicio.reporteAsistencia(
          curso.grado,
          curso.grupo,
          this.asistencia.desde || undefined,
          this.asistencia.hasta || undefined,
        ),
      );
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoReporte.set(false);
    }
  }

  protected descargarAsistencia(): void {
    const r = this.reporteAsistencia();
    if (!r) {
      return;
    }
    descargarCsv(
      `asistencia-${this.nombreCurso(r).replace(/\s+/g, '')}.csv`,
      ['Estudiante', 'Documento', 'Fallas', 'Llegadas tarde', 'Con excusa'],
      r.filas.map((f) => [f.nombreCompleto, f.documento, f.ausencias, f.tardes, f.excusas]),
    );
  }

  // ================= Utilidades =================

  #leerCurso(clave: string): { grado: number; grupo: string | null } | null {
    if (!clave) {
      return null;
    }
    const [grado, grupo] = clave.split('|');
    return { grado: Number(grado), grupo: grupo || null };
  }

  async #guardar(accion: () => Promise<string>): Promise<void> {
    this.guardando.set(true);
    try {
      this.#snackBar.open(await accion(), 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  #confirmar(titulo: string, mensaje: string, confirmar: string): Promise<boolean | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { titulo, mensaje, confirmar },
        })
        .afterClosed(),
    );
  }
}

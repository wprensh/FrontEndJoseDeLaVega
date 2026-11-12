import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';

import {
  AYUDA_TIPO_ANOTACION,
  Anotacion,
  CursoDocente,
  ESTADOS_CASO,
  EditarAnotacion,
  EstadoCaso,
  DESEMPENOS,
  ESTADOS_ASISTENCIA,
  EstadoAsistencia,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  Periodo,
  PersonaResumen,
  RegistroAsistencia,
  TIPOS_ANOTACION,
  TipoAnotacion,
  desempenoDe,
  hoyColombia,
} from '../../../core/models/academico.model';
import { enlaceWhatsApp, nombreGrado } from '../../../core/models/campus.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { fechaIsoOVacio } from '../../../core/utils/fechas';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

interface FilaNota {
  estudianteId: string;
  nombreCompleto: string;
  documento: string;
  nota: number | null;
  fallas: number | null;
  fallasRegistradas: number;
  observacion: string;
}

interface FilaLista {
  estudianteId: string;
  nombreCompleto: string;
  estado: EstadoAsistencia | 'Presente';
  observacion: string;
}

/** Días hacia atrás en que el docente todavía puede registrar la asistencia (igual que la API). */
const DIAS_ASISTENCIA = 7;

/** Posición de la pestaña Observador en la planilla de la clase. */
const PESTANA_OBSERVADOR = 2;

/** Planilla de una clase: notas del periodo, toma de asistencia con aviso a acudientes y anotaciones al observador. */
@Component({
  selector: 'app-clase-docente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    RouterLink,
    EncabezadoCampusComponent,
  ],
  templateUrl: './clase-docente.component.html',
  styleUrl: './clase-docente.component.scss',
})
export class ClaseDocenteComponent implements OnInit {
  protected readonly aIso = fechaIsoOVacio;
  readonly asignacionId = input.required<string>();

  readonly #servicio = inject(CampusAcademicoService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly desempenos = DESEMPENOS;
  protected readonly estadosAsistencia = ESTADOS_ASISTENCIA;
  protected readonly tiposAnotacion = Object.entries(TIPOS_ANOTACION) as [TipoAnotacion, string][];
  protected readonly ayudaTipo = AYUDA_TIPO_ANOTACION;
  protected readonly notaMinima = NOTA_MINIMA;
  protected readonly notaMaxima = NOTA_MAXIMA;
  protected readonly desempenoDe = desempenoDe;
  protected readonly hoy = hoyColombia();
  protected readonly fechaMinima = restarDias(this.hoy, DIAS_ASISTENCIA);

  protected readonly clase = signal<CursoDocente | null>(null);
  protected readonly periodos = signal<Periodo[]>([]);
  protected readonly error = signal<string | null>(null);

  // ---- Notas ----
  protected readonly periodoId = signal<string | null>(null);
  protected readonly filasNotas = signal<FilaNota[]>([]);
  protected readonly editable = signal(false);
  protected readonly cargandoNotas = signal(false);
  protected readonly guardandoNotas = signal(false);
  protected readonly cambiosNotas = signal(false);
  protected readonly erroresNotas = signal<string[]>([]);

  // ---- Asistencia ----
  protected readonly fecha = signal(this.hoy);
  protected readonly lista = signal<FilaLista[]>([]);
  protected readonly tomada = signal(false);
  protected readonly cargandoLista = signal(false);
  protected readonly guardandoLista = signal(false);
  protected readonly registro = signal<RegistroAsistencia | null>(null);

  // ---- Anotaciones ----
  protected readonly estudiantes = signal<PersonaResumen[]>([]);
  protected readonly anotacion = {
    estudianteId: '',
    tipo: 'Positiva' as TipoAnotacion,
    fecha: this.hoy,
    descripcion: '',
    compromisos: '',
  };
  protected readonly guardandoAnotacion = signal(false);

  // ---- Historial del observador del curso ----
  protected readonly estadosCaso = ESTADOS_CASO;
  protected readonly nombreTipo = TIPOS_ANOTACION;
  protected readonly historial = signal<Anotacion[]>([]);
  protected readonly totalHistorial = signal(0);
  protected readonly paginaHistorial = signal(1);
  protected readonly cargandoHistorial = signal(false);
  protected readonly filtroTipo = signal<TipoAnotacion | null>(null);
  protected readonly filtroBuscar = signal('');
  protected readonly hayMasHistorial = computed(() => this.historial().length < this.totalHistorial());
  #historialCargado = false;

  // ---- Mantenimiento de anotaciones ----
  protected readonly estadosCasoLista = Object.entries(ESTADOS_CASO) as [EstadoCaso, string][];
  /** Anotación que se está corrigiendo (una a la vez). */
  protected readonly editandoId = signal<string | null>(null);
  protected edicion: EditarAnotacion = { tipo: 'Observacion', fecha: '', descripcion: '', compromisos: null };
  /** Anotación a la que se le está agregando un seguimiento. */
  protected readonly seguimientoId = signal<string | null>(null);
  protected seguimiento: { texto: string; estado: EstadoCaso | null } = { texto: '', estado: null };
  protected readonly guardandoCambio = signal(false);
  /** Detalle abierto (seguimientos) por anotación. */
  protected readonly abiertas = signal<ReadonlySet<string>>(new Set());

  protected readonly titulo = computed(() => {
    const c = this.clase();
    return c ? `${c.asignatura} · ${nombreGrado(c.grado)} ${c.grupo ?? ''}`.trim() : 'Clase';
  });

  protected readonly resumenNotas = computed(() => {
    const filas = this.filasNotas();
    const conNota = filas.filter((f) => f.nota !== null);
    const promedio = conNota.length ? conNota.reduce((s, f) => s + (f.nota ?? 0), 0) / conNota.length : null;
    return {
      registradas: conNota.length,
      total: filas.length,
      promedio,
      bajos: conNota.filter((f) => (f.nota ?? 0) < 3).length,
    };
  });

  protected readonly conteoLista = computed(() => {
    const filas = this.lista();
    return {
      ausentes: filas.filter((f) => f.estado === 'Ausente').length,
      tardes: filas.filter((f) => f.estado === 'Tarde').length,
      excusas: filas.filter((f) => f.estado === 'Excusa').length,
    };
  });

  async ngOnInit(): Promise<void> {
    try {
      const datos = await this.#servicio.misCursos();
      const clase = datos.cursos.find((c) => c.asignacionId === this.asignacionId()) ?? null;
      if (!clase) {
        this.error.set('Esta clase no está en su carga académica.');
        return;
      }
      this.clase.set(clase);
      const periodos = [...datos.periodos].sort((a, b) => a.numero - b.numero);
      this.periodos.set(periodos);
      const abierto = periodos.find((p) => p.notasAbiertas) ?? periodos.at(-1);
      if (abierto) {
        this.periodoId.set(abierto.id);
        void this.cargarNotas();
      }
      void this.cargarLista();
      this.estudiantes.set(await this.#servicio.estudiantesDeClase(this.asignacionId()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  // ================= Notas =================

  protected cambiarPeriodo(id: string): void {
    this.periodoId.set(id);
    void this.cargarNotas();
  }

  protected async cargarNotas(): Promise<void> {
    const periodoId = this.periodoId();
    if (!periodoId) {
      return;
    }
    this.cargandoNotas.set(true);
    this.erroresNotas.set([]);
    try {
      const planilla = await this.#servicio.planillaNotas(this.asignacionId(), periodoId);
      this.editable.set(planilla.editable);
      this.filasNotas.set(
        planilla.filas.map((f) => ({
          estudianteId: f.estudianteId,
          nombreCompleto: f.nombreCompleto,
          documento: f.documento,
          nota: f.nota,
          fallas: f.fallas,
          fallasRegistradas: f.fallasRegistradas,
          observacion: f.observacion ?? '',
        })),
      );
      this.cambiosNotas.set(false);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoNotas.set(false);
    }
  }

  protected marcarCambio(): void {
    this.cambiosNotas.set(true);
    // Fuerza el recálculo del resumen.
    this.filasNotas.update((filas) => [...filas]);
  }

  /** Acepta "4,5" o "4.5"; vacío deja la nota sin registrar. */
  protected leerNota(fila: FilaNota, texto: string): void {
    const limpio = texto.trim().replace(',', '.');
    fila.nota = limpio === '' ? null : Math.round(Number(limpio) * 10) / 10;
    this.marcarCambio();
  }

  protected notaInvalida(fila: FilaNota): boolean {
    return fila.nota !== null && (Number.isNaN(fila.nota) || fila.nota < NOTA_MINIMA || fila.nota > NOTA_MAXIMA);
  }

  protected usarFallasRegistradas(): void {
    for (const fila of this.filasNotas()) {
      fila.fallas = fila.fallasRegistradas;
    }
    this.marcarCambio();
  }

  protected async guardarNotas(): Promise<void> {
    const periodoId = this.periodoId();
    const filas = this.filasNotas();
    if (!periodoId || filas.some((f) => this.notaInvalida(f))) {
      this.erroresNotas.set([`Las notas van de ${NOTA_MINIMA},0 a ${NOTA_MAXIMA},0. Revise las marcadas en rojo.`]);
      return;
    }
    this.guardandoNotas.set(true);
    this.erroresNotas.set([]);
    try {
      const planilla = await this.#servicio.guardarNotas(
        this.asignacionId(),
        periodoId,
        filas.map((f) => ({
          estudianteId: f.estudianteId,
          nota: f.nota,
          fallas: f.fallas,
          observacion: f.observacion.trim() || null,
        })),
      );
      this.editable.set(planilla.editable);
      this.cambiosNotas.set(false);
      this.#snackBar.open('Notas guardadas.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.erroresNotas.set([mensajeDeError(error)]);
    } finally {
      this.guardandoNotas.set(false);
    }
  }

  // ================= Asistencia =================

  protected cambiarFecha(fecha: string): void {
    if (!fecha) {
      return;
    }
    this.fecha.set(fecha);
    void this.cargarLista();
  }

  protected async cargarLista(): Promise<void> {
    this.cargandoLista.set(true);
    this.registro.set(null);
    try {
      const planilla = await this.#servicio.planillaAsistencia(this.asignacionId(), this.fecha());
      this.tomada.set(planilla.tomada);
      this.lista.set(
        planilla.filas.map((f) => ({
          estudianteId: f.estudianteId,
          nombreCompleto: f.nombreCompleto,
          estado: f.estado ?? 'Presente',
          observacion: f.observacion ?? '',
        })),
      );
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoLista.set(false);
    }
  }

  protected cambiarEstado(fila: FilaLista, estado: FilaLista['estado']): void {
    fila.estado = estado;
    this.lista.update((filas) => [...filas]);
  }

  protected async guardarLista(): Promise<void> {
    this.guardandoLista.set(true);
    try {
      const novedades = this.lista()
        .filter((f) => f.estado !== 'Presente')
        .map((f) => ({
          estudianteId: f.estudianteId,
          estado: f.estado as EstadoAsistencia,
          observacion: f.observacion.trim() || null,
        }));
      const registro = await this.#servicio.registrarAsistencia(this.asignacionId(), this.fecha(), novedades);
      this.registro.set(registro);
      this.tomada.set(true);
      this.#snackBar.open(
        registro.avisosEnviados
          ? `Asistencia guardada. Se avisó a ${registro.avisosEnviados} ${registro.avisosEnviados === 1 ? 'acudiente' : 'acudientes'}.`
          : 'Asistencia guardada.',
        'Cerrar',
        { duration: 5000 },
      );
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardandoLista.set(false);
    }
  }

  protected whatsApp(telefono: string | null, estudiante: string, estado: EstadoAsistencia): string | null {
    const c = this.clase();
    const motivo = estado === 'Tarde' ? 'llegó tarde a' : 'no asistió a';
    const mensaje =
      `Buen día. Le escribe el docente de ${c?.asignatura ?? 'la clase'} de la I.E. José de la Vega: ` +
      `${estudiante} ${motivo} la clase de hoy (${this.fecha()}). Quedamos atentos.`;
    return enlaceWhatsApp(telefono, mensaje);
  }

  // ================= Anotaciones =================

  protected async guardarAnotacion(): Promise<void> {
    const a = this.anotacion;
    if (!a.estudianteId || a.descripcion.trim().length < 10) {
      this.#snackBar.open('Elija el estudiante y describa la situación (al menos 10 caracteres).', 'Cerrar');
      return;
    }
    this.guardandoAnotacion.set(true);
    try {
      await this.#servicio.crearAnotacion({
        estudianteId: a.estudianteId,
        tipo: a.tipo,
        fecha: a.fecha,
        descripcion: a.descripcion.trim(),
        compromisos: a.compromisos.trim() || null,
      });
      this.#snackBar.open('Anotación registrada. Ya aparece en el historial del curso.', 'Cerrar', { duration: 5000 });
      a.descripcion = '';
      a.compromisos = '';
      void this.cargarHistorial();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardandoAnotacion.set(false);
    }
  }

  // ================= Historial del observador =================

  /** Se carga la primera vez que el docente abre la pestaña Observador (la tercera: Notas, Asistencia, Observador). */
  protected cambioDePestana(indice: number): void {
    if (indice === PESTANA_OBSERVADOR && !this.#historialCargado) {
      void this.cargarHistorial();
    }
  }

  protected filtrarTipo(tipo: TipoAnotacion | null): void {
    this.filtroTipo.set(tipo);
    void this.cargarHistorial();
  }

  protected buscarEnHistorial(texto: string): void {
    this.filtroBuscar.set(texto);
    void this.cargarHistorial();
  }

  /** Recarga desde la primera página, o agrega la siguiente si <paramref name="mas" /> es verdadero. */
  protected async cargarHistorial(mas = false): Promise<void> {
    const pagina = mas ? this.paginaHistorial() + 1 : 1;
    this.cargandoHistorial.set(true);
    try {
      const resultado = await this.#servicio.historialObservador(this.asignacionId(), {
        tipo: this.filtroTipo(),
        buscar: this.filtroBuscar(),
        pagina,
        tamanoPagina: 20,
      });
      this.#historialCargado = true;
      this.historial.update((actual) => (mas ? [...actual, ...resultado.items] : [...resultado.items]));
      this.totalHistorial.set(resultado.total);
      this.paginaHistorial.set(pagina);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargandoHistorial.set(false);
    }
  }

  protected alternarDetalle(id: string): void {
    this.abiertas.update((actual) => {
      const nuevo = new Set(actual);
      if (!nuevo.delete(id)) {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  protected empezarEdicion(h: Anotacion): void {
    this.seguimientoId.set(null);
    this.edicion = { tipo: h.tipo, fecha: h.fecha, descripcion: h.descripcion, compromisos: h.compromisos ?? '' };
    this.editandoId.set(h.id);
  }

  protected async guardarEdicion(h: Anotacion): Promise<void> {
    const e = this.edicion;
    if (!e.descripcion.trim() || !e.fecha) {
      this.#snackBar.open('Escriba la descripción y la fecha.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.guardandoCambio.set(true);
    try {
      const actualizada = await this.#servicio.editarAnotacion(h.id, {
        tipo: e.tipo,
        fecha: e.fecha,
        descripcion: e.descripcion.trim(),
        compromisos: e.compromisos?.trim() || null,
      });
      this.#reemplazar(actualizada);
      this.editandoId.set(null);
      this.#snackBar.open('Anotación corregida.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardandoCambio.set(false);
    }
  }

  protected async eliminar(h: Anotacion): Promise<void> {
    if (!confirm(`¿Eliminar la anotación de ${h.estudianteNombre} del ${h.fecha}? No se puede deshacer.`)) {
      return;
    }
    this.guardandoCambio.set(true);
    try {
      await this.#servicio.eliminarAnotacion(h.id);
      this.historial.update((lista) => lista.filter((a) => a.id !== h.id));
      this.totalHistorial.update((t) => Math.max(0, t - 1));
      this.#snackBar.open('Anotación eliminada.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardandoCambio.set(false);
    }
  }

  protected empezarSeguimiento(h: Anotacion): void {
    this.editandoId.set(null);
    this.seguimiento = { texto: '', estado: null };
    this.seguimientoId.set(h.id);
  }

  protected async guardarSeguimiento(h: Anotacion): Promise<void> {
    const texto = this.seguimiento.texto.trim();
    if (!texto) {
      this.#snackBar.open('Escriba el seguimiento.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.guardandoCambio.set(true);
    try {
      const actualizada = await this.#servicio.seguimientoAnotacion(h.id, texto, this.esSituacion(h.tipo) ? this.seguimiento.estado : null);
      this.#reemplazar(actualizada);
      this.seguimientoId.set(null);
      this.abiertas.update((actual) => new Set(actual).add(h.id));
      this.#snackBar.open('Seguimiento registrado.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardandoCambio.set(false);
    }
  }

  #reemplazar(actualizada: Anotacion): void {
    this.historial.update((lista) => lista.map((a) => (a.id === actualizada.id ? actualizada : a)));
  }

  protected esSituacion(tipo: TipoAnotacion): boolean {
    return tipo.startsWith('Situacion');
  }
}

function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

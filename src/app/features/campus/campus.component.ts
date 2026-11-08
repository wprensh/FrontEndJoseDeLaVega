import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { ICONOS_AVISO, Aviso } from '../../core/models/academico.model';
import { RolCampus, cursoDe } from '../../core/models/campus.model';
import { ESTADOS_ELECCION, EleccionCampus } from '../../core/models/eleccion.model';
import { CampusAcademicoService } from '../../core/services/campus-academico.service';
import { CampusService } from '../../core/services/campus.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

interface AccesoCampus {
  readonly ruta: string;
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
}

/** Módulos del campus según el rol de quien ingresa. */
const ACCESOS: Readonly<Record<RolCampus, readonly AccesoCampus[]>> = {
  Estudiante: [
    { ruta: '/campus/horario', icono: 'schedule', titulo: 'Horario', descripcion: 'Sus clases de la semana, día por día.' },
    { ruta: '/campus/boletines', icono: 'grading', titulo: 'Boletines', descripcion: 'Notas de cada periodo, promedio y puesto.' },
    { ruta: '/campus/simulacros', icono: 'quiz', titulo: 'Simulacros Saber', descripcion: 'Practique para las Pruebas Saber y vea sus resultados.' },
    { ruta: '/campus/asistencia', icono: 'event_available', titulo: 'Asistencia', descripcion: 'Fallas, llegadas tarde y excusas del año.' },
    { ruta: '/campus/observador', icono: 'diversity_3', titulo: 'Observador', descripcion: 'Anotaciones positivas y de convivencia.' },
    { ruta: '/campus/circulares', icono: 'campaign', titulo: 'Circulares', descripcion: 'Comunicados del colegio.' },
    { ruta: '/campus/calendario', icono: 'calendar_month', titulo: 'Calendario', descripcion: 'Evaluaciones, reuniones y actividades.' },
    { ruta: '/campus/carnet', icono: 'badge', titulo: 'Carné digital', descripcion: 'Su carné estudiantil con código QR.' },
  ],
  Acudiente: [
    { ruta: '/campus/boletines', icono: 'grading', titulo: 'Boletines', descripcion: 'Notas de cada periodo, listas para imprimir.' },
    { ruta: '/campus/asistencia', icono: 'event_available', titulo: 'Asistencia', descripcion: 'Fallas y llegadas tarde de sus hijos.' },
    { ruta: '/campus/horario', icono: 'schedule', titulo: 'Horario', descripcion: 'Las clases de la semana de sus hijos.' },
    { ruta: '/campus/observador', icono: 'diversity_3', titulo: 'Observador', descripcion: 'Anotaciones del colegio; confirme que las leyó.' },
    { ruta: '/campus/simulacros', icono: 'quiz', titulo: 'Simulacros Saber', descripcion: 'Resultados de los simulacros presentados.' },
    { ruta: '/campus/circulares', icono: 'campaign', titulo: 'Circulares', descripcion: 'Comunicados y confirmación de lectura.' },
    { ruta: '/campus/calendario', icono: 'calendar_month', titulo: 'Calendario', descripcion: 'Reuniones, entregas de boletines y actividades.' },
    { ruta: '/campus/carnet', icono: 'badge', titulo: 'Carné de acudiente', descripcion: 'Para identificarse en la portería.' },
  ],
  Docente: [
    { ruta: '/campus/docente', icono: 'co_present', titulo: 'Mis clases', descripcion: 'Notas, asistencia y anotaciones de sus cursos.' },
    { ruta: '/campus/horario', icono: 'schedule', titulo: 'Mi horario', descripcion: 'Sus clases de la semana por día y hora.' },
    { ruta: '/campus/simulacros', icono: 'quiz', titulo: 'Simulacros Saber', descripcion: 'Resultados de sus cursos por área y pregunta.' },
    { ruta: '/campus/circulares', icono: 'campaign', titulo: 'Circulares', descripcion: 'Comunicados para docentes.' },
    { ruta: '/campus/calendario', icono: 'calendar_month', titulo: 'Calendario', descripcion: 'Calendario escolar y fechas de cierre.' },
    { ruta: '/campus/carnet', icono: 'badge', titulo: 'Carné docente', descripcion: 'Su carné institucional con código QR.' },
  ],
};

/**
 * Plantilla 6: Campus Virtual. Estudiantes, docentes y acudientes entran con su número de documento y la
 * clave de acceso que entrega el colegio. Adentro ven sus avisos, la plataforma académica según su rol y las
 * elecciones escolares (estudiantes votan y docentes siguen la participación).
 */
@Component({
  selector: 'app-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeadingComponent,
  ],
  templateUrl: './campus.component.html',
  styleUrl: './campus.component.scss',
})
export class CampusComponent {
  /** ?motivo=vencida cuando la sesión terminó sola. */
  readonly motivo = input<string>();

  readonly #fb = inject(NonNullableFormBuilder);
  readonly #router = inject(Router);
  #perfilActualizado = false;
  protected readonly campus = inject(CampusService);
  protected readonly academico = inject(CampusAcademicoService);

  protected readonly estados = ESTADOS_ELECCION;
  protected readonly cursoDe = cursoDe;
  protected readonly ingresando = signal(false);
  protected readonly errorIngreso = signal<string | null>(null);
  protected readonly elecciones = signal<EleccionCampus[] | null>(null);
  protected readonly errorElecciones = signal<string | null>(null);
  protected readonly avisos = signal<Aviso[] | null>(null);
  protected readonly iconosAviso = ICONOS_AVISO;
  protected readonly accesos = computed(() => {
    const rol = this.campus.perfil()?.rol;
    return rol ? ACCESOS[rol] : [];
  });
  protected readonly votaODocente = computed(() => this.campus.perfil()?.rol !== 'Acudiente');

  protected readonly formulario = this.#fb.group({
    documento: ['', Validators.required],
    clave: ['', Validators.required],
  });

  constructor() {
    // Solo al cambiar de persona: actualizar el perfil no vuelve a cargar avisos ni elecciones.
    const persona = computed(() => {
      const p = this.campus.perfil();
      return p ? `${p.id}|${p.rol}` : null;
    });
    effect(() => {
      const clave = persona();
      if (!clave) {
        this.#perfilActualizado = false;
        return;
      }
      if (!this.#perfilActualizado) {
        this.#perfilActualizado = true;
        void this.campus.actualizarPerfil().catch(() => undefined);
      }
      void this.cargarAvisos();
      if (!clave.endsWith('|Acudiente')) {
        void this.cargarElecciones();
      }
    });
  }

  protected async ingresar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { documento, clave } = this.formulario.getRawValue();
    this.ingresando.set(true);
    this.errorIngreso.set(null);
    try {
      await this.campus.iniciarSesion(documento.trim(), clave.trim());
      this.formulario.reset();
    } catch (error) {
      this.formulario.controls.clave.reset();
      this.errorIngreso.set(mensajeDeError(error));
    } finally {
      this.ingresando.set(false);
    }
  }

  protected async cargarElecciones(): Promise<void> {
    this.errorElecciones.set(null);
    try {
      this.elecciones.set(await this.campus.elecciones());
    } catch (error) {
      this.errorElecciones.set(mensajeDeError(error));
    }
  }

  protected async cargarAvisos(): Promise<void> {
    try {
      this.avisos.set([...(await this.academico.avisos()).items]);
    } catch {
      this.avisos.set([]);
    }
  }

  protected async abrirAviso(aviso: Aviso): Promise<void> {
    if (!aviso.leido) {
      this.avisos.update((lista) => lista?.map((a) => (a.id === aviso.id ? { ...a, leido: true } : a)) ?? null);
      await this.academico.marcarLeidos([aviso.id]).catch(() => undefined);
    }
    if (aviso.enlace?.startsWith('/')) {
      await this.#router.navigateByUrl(aviso.enlace);
    }
  }

  protected async marcarTodos(): Promise<void> {
    await this.academico.marcarLeidos().catch(() => undefined);
    this.avisos.update((lista) => lista?.map((a) => ({ ...a, leido: true })) ?? null);
  }

  protected salir(): void {
    this.campus.cerrar();
    this.elecciones.set(null);
    this.avisos.set(null);
  }
}

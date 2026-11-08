import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  AYUDA_TIPO_ANOTACION,
  Anotacion,
  ESTADOS_CASO,
  EstadoCaso,
  Observador,
  PersonaResumen,
  TIPOS_ANOTACION,
  TipoAnotacion,
  hoyColombia,
} from '../../../core/models/academico.model';
import { GRADOS, cursoDe, nombreGrado } from '../../../core/models/campus.model';
import { paginadorEnEspanol } from '../../../core/paginador-intl';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { AnotacionTarjetaComponent } from '../../../shared/convivencia/anotacion-tarjeta.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/**
 * Convivencia escolar (Ley 1620 de 2013): anotaciones del observador, situaciones tipo I, II y III con su
 * seguimiento y cierre, y el observador completo de cada estudiante para imprimir.
 */
@Component({
  selector: 'app-convivencia-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    AnotacionTarjetaComponent,
    BarraAdminComponent,
    PageHeadingComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './convivencia-admin.component.html',
  styleUrl: './convivencia-admin.component.scss',
})
export class ConvivenciaAdminComponent implements OnInit {
  readonly #servicio = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly sesion = inject(SesionService);

  protected readonly tipos = Object.entries(TIPOS_ANOTACION) as [TipoAnotacion, string][];
  protected readonly estados = Object.entries(ESTADOS_CASO) as [EstadoCaso, string][];
  protected readonly ayudaTipo = AYUDA_TIPO_ANOTACION;
  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly cursoDe = cursoDe;
  protected readonly hoy = hoyColombia();

  protected filtro = {
    tipo: null as TipoAnotacion | null,
    estado: null as EstadoCaso | null,
    grado: null as number | null,
    buscar: '',
    soloSituaciones: false,
  };
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(20);
  protected readonly anotaciones = signal<Anotacion[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  // ---- Nueva anotación ----
  protected readonly creando = signal(false);
  protected readonly sugerencias = signal<PersonaResumen[]>([]);
  protected estudiante: PersonaResumen | null = null;
  protected textoEstudiante = '';
  protected nueva = { tipo: 'SituacionTipoI' as TipoAnotacion, fecha: this.hoy, descripcion: '', compromisos: '' };
  protected readonly guardando = signal(false);
  #busqueda?: ReturnType<typeof setTimeout>;

  // ---- Seguimiento ----
  protected readonly seleccionada = signal<Anotacion | null>(null);
  protected seguimiento = { texto: '', estado: null as EstadoCaso | null };

  // ---- Observador ----
  protected readonly observador = signal<Observador | null>(null);

  ngOnInit(): void {
    void this.recargar();
  }

  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.#servicio.anotaciones({
        ...this.filtro,
        buscar: this.filtro.buscar.trim() || null,
        pagina: this.pagina(),
        tamanoPagina: this.tamanoPagina(),
      });
      this.anotaciones.set([...resultado.items]);
      this.total.set(resultado.total);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected filtrar(): void {
    this.pagina.set(1);
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex + 1);
    this.tamanoPagina.set(evento.pageSize);
    void this.recargar();
  }

  // ---- Nueva anotación ----

  protected buscarEstudiante(texto: string): void {
    this.textoEstudiante = texto;
    this.estudiante = null;
    clearTimeout(this.#busqueda);
    if (texto.trim().length < 3) {
      this.sugerencias.set([]);
      return;
    }
    this.#busqueda = setTimeout(async () => {
      try {
        this.sugerencias.set(await this.#servicio.buscarEstudiantes(texto.trim()));
      } catch {
        this.sugerencias.set([]);
      }
    }, 300);
  }

  protected elegirEstudiante(e: PersonaResumen): void {
    this.estudiante = e;
    this.textoEstudiante = `${e.nombreCompleto} (${cursoDe(e)})`;
  }

  protected nombreSugerencia = (e: PersonaResumen | string | null): string =>
    typeof e === 'string' ? e : e ? `${e.nombreCompleto} (${cursoDe(e)})` : '';

  protected async crear(): Promise<void> {
    if (!this.estudiante || this.nueva.descripcion.trim().length < 10) {
      this.#snackBar.open('Elija el estudiante de la lista y describa los hechos (al menos 10 caracteres).', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      await this.#servicio.crearAnotacion({
        estudianteId: this.estudiante.id,
        tipo: this.nueva.tipo,
        fecha: this.nueva.fecha,
        descripcion: this.nueva.descripcion.trim(),
        compromisos: this.nueva.compromisos.trim() || null,
      });
      this.#snackBar.open('Anotación registrada. El acudiente recibe el aviso.', 'Cerrar', { duration: 4000 });
      this.creando.set(false);
      this.estudiante = null;
      this.textoEstudiante = '';
      this.nueva = { tipo: 'SituacionTipoI', fecha: this.hoy, descripcion: '', compromisos: '' };
      await this.recargar();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  // ---- Seguimiento ----

  protected abrirSeguimiento(a: Anotacion): void {
    this.seleccionada.set(this.seleccionada()?.id === a.id ? null : a);
    this.seguimiento = { texto: '', estado: null };
  }

  protected async guardarSeguimiento(a: Anotacion): Promise<void> {
    if (this.seguimiento.texto.trim().length < 5) {
      this.#snackBar.open('Escriba el seguimiento.', 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      const actualizada = await this.#servicio.seguimiento(a.id, this.seguimiento.texto.trim(), this.seguimiento.estado);
      this.anotaciones.update((lista) => lista.map((x) => (x.id === a.id ? actualizada : x)));
      this.seleccionada.set(null);
      this.#snackBar.open('Seguimiento registrado.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }

  // ---- Observador ----

  protected async verObservador(estudianteId: string): Promise<void> {
    try {
      this.observador.set(await this.#servicio.observador(estudianteId));
      queueMicrotask(() => document.getElementById('observador')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected imprimirObservador(): void {
    document.body.classList.add('imprimiendo-boletin');
    window.addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-boletin'), { once: true });
    window.print();
  }
}

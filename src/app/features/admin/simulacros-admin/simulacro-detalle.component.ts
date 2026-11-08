import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { nombreGrado } from '../../../core/models/campus.model';
import {
  AREAS,
  AREAS_PRUEBA,
  AreaEvaluada,
  ESTADOS_SIMULACRO,
  GuardarPregunta,
  LETRAS,
  OPCIONES_MAXIMAS,
  Pregunta,
  ResultadosSimulacro,
  Simulacro,
  TIPOS_PRUEBA,
  leerPreguntas,
} from '../../../core/models/simulacro.model';
import { SesionService } from '../../../core/services/sesion.service';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { ResultadosSimulacroComponent } from '../../../shared/simulacros/resultados-simulacro.component';
import { SimulacroDialogComponent } from './simulacro-dialog.component';

/** Pregunta en edición (las opciones se editan como lista mutable). */
interface PreguntaEditable extends GuardarPregunta {
  clave: number;
}

const EJEMPLO = `[Matemáticas] Si un cuaderno cuesta $3.500, ¿cuánto cuestan 4 cuadernos?
A) $12.000
*B) $14.000
C) $14.500
D) $15.000
Explicación: 4 × 3.500 = 14.000.

[Lectura crítica] ¿Cuál es la intención principal de un texto argumentativo?
A) Narrar una historia
B) Describir un lugar
*C) Convencer al lector de una idea
D) Dar instrucciones`;

/** Un simulacro: datos, banco de preguntas (editor e importación desde texto) y resultados. */
@Component({
  selector: 'app-simulacro-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    BarraAdminComponent,
    PageHeadingComponent,
    ResultadosSimulacroComponent,
  ],
  templateUrl: './simulacro-detalle.component.html',
  styleUrl: './simulacro-detalle.component.scss',
})
export class SimulacroDetalleComponent {
  /** Id de la ruta /admin/simulacros/:id. */
  readonly id = input.required<string>();

  readonly #servicio = inject(SimulacrosService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly sesion = inject(SesionService);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly estados = ESTADOS_SIMULACRO;
  protected readonly areas = AREAS;
  protected readonly letras = LETRAS;
  protected readonly maximoOpciones = OPCIONES_MAXIMAS;
  protected readonly ejemplo = EJEMPLO;

  protected readonly simulacro = signal<Simulacro | null>(null);
  protected readonly preguntas = signal<PreguntaEditable[]>([]);
  protected readonly resultados = signal<ResultadosSimulacro | null>(null);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly cambios = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pestana = signal(0);

  protected readonly textoImportar = signal('');
  protected readonly erroresImportar = signal<string[]>([]);
  protected readonly areaImportar = signal<AreaEvaluada>('Matematicas');

  #clave = 0;

  protected readonly puedeEditar = computed(() => this.sesion.puede('Simulacros', 'Editar'));
  /** Con intentos solo se corrigen textos (la API rechaza agregar, quitar o cambiar la correcta). */
  protected readonly conIntentos = computed(() => (this.simulacro()?.presentados ?? 0) > 0);
  protected readonly areasDisponibles = computed(() => {
    const tipo = this.simulacro()?.tipo ?? 'Interna';
    return AREAS_PRUEBA[tipo].map((a) => [a, AREAS[a]] as const);
  });
  protected readonly conteoPorArea = computed(() => {
    const conteo = new Map<AreaEvaluada, number>();
    for (const p of this.preguntas()) {
      conteo.set(p.area, (conteo.get(p.area) ?? 0) + 1);
    }
    return [...conteo].map(([area, total]) => ({ area: AREAS[area], total }));
  });
  protected readonly vistaPrevia = computed(() =>
    this.textoImportar().trim() ? leerPreguntas(this.textoImportar(), this.areaImportar()) : null,
  );

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.cargar(id));
    });
  }

  protected grados(s: Simulacro): string {
    return s.grados.map(nombreGrado).join(', ');
  }

  async cargar(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const detalle = await this.#servicio.obtener(id);
      this.simulacro.set(detalle.simulacro);
      this.#cargarPreguntas(detalle.preguntas);
      this.areaImportar.set(AREAS_PRUEBA[detalle.simulacro.tipo][0]);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  #cargarPreguntas(preguntas: readonly Pregunta[]): void {
    this.preguntas.set(
      preguntas.map((p) => ({
        clave: ++this.#clave,
        id: p.id,
        area: p.area,
        competencia: p.competencia,
        contexto: p.contexto,
        enunciado: p.enunciado,
        imagenUrl: p.imagenUrl,
        opciones: [...p.opciones],
        correcta: p.correcta,
        explicacion: p.explicacion,
      })),
    );
    this.cambios.set(false);
  }

  protected async cambiarPestana(indice: number): Promise<void> {
    this.pestana.set(indice);
    if (indice === 1) {
      await this.cargarResultados();
    }
  }

  protected async cargarResultados(): Promise<void> {
    try {
      this.resultados.set(await this.#servicio.resultados(this.id()));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async editarDatos(): Promise<void> {
    const actualizado = await firstValueFrom(
      this.#dialog
        .open<SimulacroDialogComponent, Simulacro | null, Simulacro>(SimulacroDialogComponent, {
          data: this.simulacro(),
          width: '640px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (actualizado) {
      this.simulacro.set(actualizado);
      this.#snackBar.open('Simulacro actualizado.', 'Cerrar', { duration: 3000 });
    }
  }

  // ---------- Editor de preguntas ----------

  protected marcarCambio(): void {
    this.cambios.set(true);
  }

  protected agregar(): void {
    const area = this.preguntas().at(-1)?.area ?? this.areasDisponibles()[0][0];
    this.preguntas.update((lista) => [
      ...lista,
      {
        clave: ++this.#clave,
        id: null,
        area,
        competencia: null,
        contexto: null,
        enunciado: '',
        imagenUrl: null,
        opciones: ['', '', '', ''],
        correcta: 0,
        explicacion: null,
      },
    ]);
    this.cambios.set(true);
  }

  protected quitar(p: PreguntaEditable): void {
    this.preguntas.update((lista) => lista.filter((x) => x !== p));
    this.cambios.set(true);
  }

  protected mover(indice: number, delta: number): void {
    this.preguntas.update((lista) => {
      const copia = [...lista];
      const destino = indice + delta;
      if (destino < 0 || destino >= copia.length) {
        return lista;
      }
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
    this.cambios.set(true);
  }

  protected agregarOpcion(p: PreguntaEditable): void {
    if (p.opciones.length < OPCIONES_MAXIMAS) {
      p.opciones = [...p.opciones, ''];
      this.preguntas.update((lista) => [...lista]);
      this.cambios.set(true);
    }
  }

  protected quitarOpcion(p: PreguntaEditable, indice: number): void {
    if (p.opciones.length <= 2) {
      return;
    }
    p.opciones = p.opciones.filter((_, i) => i !== indice);
    if (p.correcta === indice) {
      p.correcta = 0;
    } else if (p.correcta > indice) {
      p.correcta--;
    }
    this.preguntas.update((lista) => [...lista]);
    this.cambios.set(true);
  }

  protected cambiarOpcion(p: PreguntaEditable, indice: number, valor: string): void {
    p.opciones[indice] = valor;
    this.cambios.set(true);
  }

  protected importar(reemplazar: boolean): void {
    const vista = this.vistaPrevia();
    if (!vista || !vista.preguntas.length) {
      this.erroresImportar.set(vista ? [] : ['Pegue al menos una pregunta.']);
      return;
    }
    const nuevas = vista.preguntas.map((p) => ({ ...p, clave: ++this.#clave }));
    this.preguntas.update((lista) => (reemplazar ? nuevas : [...lista, ...nuevas]));
    this.erroresImportar.set(vista.errores);
    this.textoImportar.set('');
    this.cambios.set(true);
    this.#snackBar.open(
      `${nuevas.length} pregunta(s) agregadas al editor. Revise y pulse «Guardar preguntas».`,
      'Cerrar',
      { duration: 5000 },
    );
  }

  protected descartar(): void {
    void this.cargar(this.id());
  }

  protected async guardarPreguntas(): Promise<void> {
    const lista = this.preguntas();
    const incompleta = lista.findIndex(
      (p) => !p.enunciado.trim() || p.opciones.length < 2 || p.opciones.some((o) => !o.trim()),
    );
    if (incompleta >= 0) {
      this.#snackBar.open(`La pregunta ${incompleta + 1} tiene el enunciado o alguna opción vacía.`, 'Cerrar');
      return;
    }
    this.guardando.set(true);
    try {
      const detalle = await this.#servicio.guardarPreguntas(
        this.id(),
        lista.map(({ clave: _, ...p }) => ({
          ...p,
          enunciado: p.enunciado.trim(),
          opciones: p.opciones.map((o) => o.trim()),
          competencia: p.competencia?.trim() || null,
          contexto: p.contexto?.trim() || null,
          imagenUrl: p.imagenUrl?.trim() || null,
          explicacion: p.explicacion?.trim() || null,
        })),
      );
      this.simulacro.set(detalle.simulacro);
      this.#cargarPreguntas(detalle.preguntas);
      this.#snackBar.open('Preguntas guardadas.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }
}

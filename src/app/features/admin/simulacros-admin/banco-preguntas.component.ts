import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import {
  AREAS,
  AreaEvaluada,
  DIFICULTADES,
  DificultadPregunta,
  LETRAS,
  PreguntaBanco,
  leerPreguntas,
  textoGrados,
} from '../../../core/models/simulacro.model';
import { SesionService } from '../../../core/services/sesion.service';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { PreguntaBancoDialogComponent, PreguntaBancoDialogData } from './pregunta-banco-dialog.component';

/** Banco de preguntas tipo Saber del colegio: buscar, crear, editar, cargar desde texto y eliminar. */
@Component({
  selector: 'app-banco-preguntas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Banco de preguntas"
        subtitulo="Preguntas tipo Saber para armar simulacros"
        etiqueta="Simulacros Saber"
      />

      <section class="tarjeta">
        <div class="barra">
          <p class="ayuda">
            Guarde aquí las preguntas una sola vez y úselas en varios simulacros. Al armar un simulacro, en
            <a routerLink="/admin/simulacros">Simulacros Saber</a> pulse «Agregar desde el banco» para elegirlas o tomarlas al azar
            por área. Corregir una pregunta aquí no cambia los simulacros que ya la usan.
          </p>
          @if (sesion.puede('Simulacros', 'Crear')) {
            <button mat-flat-button class="boton-azul" type="button" (click)="editar(null)">
              <mat-icon aria-hidden="true">add</mat-icon>
              Nueva pregunta
            </button>
          }
        </div>

        <div class="filtros">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Área</mat-label>
            <mat-select [value]="area()" (selectionChange)="area.set($event.value)">
              <mat-option [value]="null">Todas</mat-option>
              @for (a of areas; track a[0]) {
                <mat-option [value]="a[0]">{{ a[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Grado</mat-label>
            <mat-select [value]="grado()" (selectionChange)="grado.set($event.value)">
              <mat-option [value]="null">Todos</mat-option>
              @for (g of grados; track g) {
                <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Dificultad</mat-label>
            <mat-select [value]="dificultad()" (selectionChange)="dificultad.set($event.value)">
              <mat-option [value]="null">Todas</mat-option>
              @for (d of dificultades; track d[0]) {
                <mat-option [value]="d[0]">{{ d[1] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic" class="buscar">
            <mat-label>Buscar en el texto</mat-label>
            <mat-icon matPrefix aria-hidden="true">search</mat-icon>
            <input matInput [value]="texto()" (input)="texto.set($any($event.target).value)" />
          </mat-form-field>
        </div>

        @if (conteo().length) {
          <p class="conteo" aria-live="polite">
            <span><strong>{{ filtradas().length }}</strong> de {{ preguntas().length }} preguntas</span>
            @for (c of conteo(); track c.area) {
              <span>{{ c.nombre }}: <strong>{{ c.total }}</strong></span>
            }
          </p>
        }

        @if (cargando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
        }
        @if (error(); as e) {
          <p class="error" role="alert">{{ e }}</p>
        }

        <ol class="lista">
          @for (p of filtradas(); track p.id) {
            <li class="pregunta">
              <details>
                <summary>
                  <span class="etiquetas">
                    <span class="chip area">{{ areasNombre[p.area] }}</span>
                    <span class="chip" [attr.data-dificultad]="p.dificultad">{{ p.dificultad }}</span>
                    <span class="chip">{{ textoGrados(p.grados, nombreGrado) }}</span>
                    @if (p.usos) {
                      <span class="chip usada" matTooltip="Simulacros que la usan">En {{ p.usos }} simulacro(s)</span>
                    }
                  </span>
                  <span class="enunciado">{{ p.enunciado }}</span>
                </summary>
                <div class="cuerpo">
                  @if (p.competencia) {
                    <p class="competencia">{{ p.competencia }}</p>
                  }
                  @if (p.contexto) {
                    <p class="contexto">{{ p.contexto }}</p>
                  }
                  <p class="texto">{{ p.enunciado }}</p>
                  <ul class="opciones">
                    @for (o of p.opciones; track $index; let j = $index) {
                      <li [class.correcta]="j === p.correcta">
                        <strong>{{ letras[j] }}.</strong> {{ o }}
                        @if (j === p.correcta) {
                          <mat-icon aria-label="Respuesta correcta">check_circle</mat-icon>
                        }
                      </li>
                    }
                  </ul>
                  @if (p.explicacion) {
                    <p class="explicacion"><strong>Explicación:</strong> {{ p.explicacion }}</p>
                  }
                  <div class="acciones">
                    @if (sesion.puede('Simulacros', 'Editar')) {
                      <button mat-stroked-button type="button" (click)="editar(p)">
                        <mat-icon aria-hidden="true">edit</mat-icon>
                        Editar
                      </button>
                    }
                    @if (sesion.puede('Simulacros', 'Eliminar')) {
                      <button mat-button type="button" (click)="eliminar(p)">
                        <mat-icon aria-hidden="true">delete</mat-icon>
                        Eliminar
                      </button>
                    }
                  </div>
                </div>
              </details>
            </li>
          } @empty {
            @if (!cargando()) {
              <li class="vacio">{{ preguntas().length ? 'Ninguna pregunta coincide con los filtros.' : 'El banco está vacío.' }}</li>
            }
          }
        </ol>
      </section>

      @if (sesion.puede('Simulacros', 'Crear')) {
        <section class="tarjeta importar">
          <h3>Cargar varias preguntas pegadas como texto</h3>
          <p class="ayuda">
            Una línea en blanco entre preguntas. Las opciones empiezan con A), B), C)... y la correcta lleva un asterisco
            (<code>*B)</code>). El área entre corchetes y la línea «Explicación:» son opcionales.
          </p>
          <div class="filtros">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Área si no se indica</mat-label>
              <mat-select [(ngModel)]="importar.area">
                @for (a of areas; track a[0]) {
                  <mat-option [value]="a[0]">{{ a[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Grados</mat-label>
              <mat-select multiple [(ngModel)]="importar.grados" placeholder="Todos">
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Dificultad</mat-label>
              <mat-select [(ngModel)]="importar.dificultad">
                @for (d of dificultades; track d[0]) {
                  <mat-option [value]="d[0]">{{ d[1] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Preguntas</mat-label>
            <textarea matInput rows="8" class="monoespacio" [ngModel]="textoImportar()" (ngModelChange)="textoImportar.set($event)"></textarea>
          </mat-form-field>
          @if (vistaPrevia(); as v) {
            <p class="ayuda" aria-live="polite">
              {{ v.preguntas.length }} pregunta(s) válidas
              @if (v.errores.length) {
                · <span class="error">{{ v.errores.length }} con errores</span>
              }
            </p>
            @for (e of v.errores; track $index) {
              <p class="error">{{ e }}</p>
            }
          }
          <div class="acciones">
            <button mat-flat-button class="boton-azul" type="button" [disabled]="!vistaPrevia()?.preguntas?.length || guardando()" (click)="cargarTexto()">
              {{ guardando() ? 'Guardando...' : 'Agregar al banco' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block-end: 1rem;
    }

    .ayuda {
      flex: 1 1 20rem;
      margin: 0;
      color: var(--jv-texto-suave);

      a {
        color: var(--jv-azul);
        font-weight: 600;
      }
    }

    .filtros {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
      gap: 0.75rem;
      margin-block-end: 0.75rem;

      .buscar {
        grid-column: span 2;

        @media (width < 640px) {
          grid-column: auto;
        }
      }
    }

    .conteo {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1rem;
      margin: 0 0 0.75rem;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;
    }

    .lista {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .pregunta details {
      border: 1px solid var(--jv-borde);
      border-radius: var(--jv-radio);
      background: var(--jv-superficie, #fff);

      &[open] summary {
        border-block-end: 1px solid var(--jv-borde);
      }
    }

    summary {
      display: grid;
      gap: 0.35rem;
      padding: 0.6rem 0.8rem;
      cursor: pointer;
    }

    .etiquetas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .chip {
      padding: 0.05rem 0.55rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.75rem;
      font-weight: 600;

      &.area {
        background: #e8f0fb;
        border-color: #c4d6f2;
      }

      &[data-dificultad='Alta'] {
        background: #fdecea;
        border-color: #f2c4bf;
      }

      &[data-dificultad='Baja'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
      }

      &.usada {
        background: #fff6e0;
        border-color: #f0d58c;
      }
    }

    .enunciado {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: pre-line;
    }

    .cuerpo {
      display: grid;
      gap: 0.5rem;
      padding: 0.8rem;

      p {
        margin: 0;
        white-space: pre-line;
      }
    }

    .competencia {
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .contexto {
      padding: 0.6rem 0.8rem;
      border-inline-start: 3px solid var(--jv-borde);
      background: var(--jv-superficie-suave);
    }

    .texto {
      font-weight: 600;
    }

    .opciones {
      display: grid;
      gap: 0.25rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.5rem;
        border-radius: var(--jv-radio);
      }

      .correcta {
        background: #eef8f2;
        color: #1d6b3d;

        mat-icon {
          font-size: 18px;
          inline-size: 18px;
          block-size: 18px;
        }
      }
    }

    .explicacion {
      color: var(--jv-texto-suave);
    }

    .acciones {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .vacio {
      padding: 2rem;
      color: var(--jv-texto-suave);
      text-align: center;
    }

    .importar {
      display: grid;
      gap: 0.75rem;
      margin-block-start: 1rem;

      h3 {
        margin: 0;
      }
    }

    .monoespacio {
      font-family: ui-monospace, monospace;
    }

    .error {
      margin: 0;
      color: var(--jv-rojo);
    }
  `,
})
export class BancoPreguntasComponent implements OnInit {
  readonly #servicio = inject(SimulacrosService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly sesion = inject(SesionService);

  protected readonly areas = Object.entries(AREAS) as [AreaEvaluada, string][];
  protected readonly areasNombre = AREAS;
  protected readonly dificultades = Object.entries(DIFICULTADES) as [DificultadPregunta, string][];
  protected readonly grados = GRADOS;
  protected readonly letras = LETRAS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly textoGrados = textoGrados;

  protected readonly preguntas = signal<PreguntaBanco[]>([]);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly area = signal<AreaEvaluada | null>(null);
  protected readonly grado = signal<number | null>(null);
  protected readonly dificultad = signal<DificultadPregunta | null>(null);
  protected readonly texto = signal('');

  protected readonly importar = { area: 'Matematicas' as AreaEvaluada, grados: [10, 11], dificultad: 'Media' as DificultadPregunta };
  protected readonly textoImportar = signal('');
  protected readonly vistaPrevia = computed(() =>
    this.textoImportar().trim() ? leerPreguntas(this.textoImportar(), this.importar.area) : null,
  );

  /** Los filtros se aplican en el navegador: el banco cabe completo en memoria. */
  protected readonly filtradas = computed(() => {
    const area = this.area();
    const grado = this.grado();
    const dificultad = this.dificultad();
    const texto = normalizar(this.texto().trim());
    return this.preguntas().filter(
      (p) =>
        (!area || p.area === area) &&
        (grado === null || !p.grados.length || p.grados.includes(grado)) &&
        (!dificultad || p.dificultad === dificultad) &&
        (!texto || normalizar([p.enunciado, p.contexto, p.competencia].join(' ')).includes(texto)),
    );
  });

  protected readonly conteo = computed(() => {
    const conteo = new Map<AreaEvaluada, number>();
    for (const p of this.filtradas()) {
      conteo.set(p.area, (conteo.get(p.area) ?? 0) + 1);
    }
    return [...conteo].map(([area, total]) => ({ area, nombre: AREAS[area], total }));
  });

  ngOnInit(): void {
    void this.recargar();
  }

  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.preguntas.set(await this.#servicio.banco());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async editar(pregunta: PreguntaBanco | null): Promise<void> {
    const guardada = await firstValueFrom(
      this.#dialog
        .open<PreguntaBancoDialogComponent, PreguntaBancoDialogData, PreguntaBanco>(PreguntaBancoDialogComponent, {
          data: { pregunta, area: this.area() ?? undefined },
          width: '720px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (guardada) {
      this.preguntas.update((lista) =>
        pregunta ? lista.map((p) => (p.id === guardada.id ? guardada : p)) : [...lista, guardada],
      );
      this.#snackBar.open(pregunta ? 'Pregunta actualizada.' : 'Pregunta agregada al banco.', 'Cerrar', { duration: 3000 });
    }
  }

  protected async eliminar(p: PreguntaBanco): Promise<void> {
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Eliminar del banco',
            mensaje: p.usos
              ? 'Se quita del banco. Los simulacros que ya la usan conservan su copia.'
              : '¿Eliminar esta pregunta del banco?',
            confirmar: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (!confirmado) {
      return;
    }
    try {
      await this.#servicio.eliminarDelBanco(p.id);
      this.preguntas.update((lista) => lista.filter((x) => x.id !== p.id));
      this.#snackBar.open('Pregunta eliminada del banco.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async cargarTexto(): Promise<void> {
    const vista = leerPreguntas(this.textoImportar(), this.importar.area);
    if (!vista.preguntas.length) {
      return;
    }
    this.guardando.set(true);
    try {
      const nuevas = await this.#servicio.cargarLoteEnBanco(
        vista.preguntas.map(({ id: _, ...p }) => ({ ...p, grados: [...this.importar.grados], dificultad: this.importar.dificultad })),
      );
      this.preguntas.update((lista) => [...lista, ...nuevas]);
      this.textoImportar.set('');
      this.#snackBar.open(`${nuevas.length} pregunta(s) agregadas al banco.`, 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.guardando.set(false);
    }
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

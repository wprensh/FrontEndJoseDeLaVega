import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Anotacion, Observador, TIPOS_ANOTACION } from '../../../core/models/academico.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { CampusService } from '../../../core/services/campus.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { AnotacionTarjetaComponent } from '../../../shared/convivencia/anotacion-tarjeta.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';
import { SelectorEstudianteComponent } from '../compartido/selector-estudiante.component';

/** Observador del estudiante. El acudiente confirma con «Enterado» que leyó cada anotación. */
@Component({
  selector: 'app-observador-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    AnotacionTarjetaComponent,
    EncabezadoCampusComponent,
    SelectorEstudianteComponent,
  ],
  template: `
    <div class="contenedor">
      <app-encabezado-campus
        titulo="Observador del estudiante"
        subtitulo="Reconocimientos y situaciones de convivencia (Ley 1620 de 2013)"
        icono="diversity_3"
      />
      <app-selector-estudiante [(estudianteId)]="estudianteId" />

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando observador" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (observador(); as o) {
        @if (o.resumen.length) {
          <ul class="resumen" aria-label="Resumen">
            @for (r of o.resumen; track r.tipo) {
              <li [attr.data-tipo]="r.tipo"><strong>{{ r.total }}</strong> {{ tipos[r.tipo] }}</li>
            }
          </ul>
        }
        <div class="lista">
          @for (a of o.anotaciones; track a.id) {
            <app-anotacion-tarjeta [anotacion]="a">
              @if (esAcudiente() && !a.enteradoEn) {
                <button mat-flat-button class="boton-azul" type="button" [disabled]="confirmando() === a.id" (click)="enterado(a)">
                  <mat-icon aria-hidden="true">done</mat-icon>
                  Enterado
                </button>
              }
            </app-anotacion-tarjeta>
          } @empty {
            <p class="tarjeta vacio">No hay anotaciones en el observador.</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .resumen {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;

      li {
        padding: 0.3rem 0.8rem;
        border-radius: 999px;
        background: var(--jv-superficie);
        border: 1px solid var(--jv-borde);
      }

      [data-tipo='Positiva'] {
        background: #e5f5ec;
      }
    }

    .lista {
      display: grid;
      gap: 0.9rem;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class ObservadorCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);
  readonly #campus = inject(CampusService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly tipos = TIPOS_ANOTACION;
  protected readonly estudianteId = signal<string | null>(null);
  protected readonly observador = signal<Observador | null>(null);
  protected readonly cargando = signal(false);
  protected readonly confirmando = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly esAcudiente = computed(() => this.#campus.perfil()?.rol === 'Acudiente');

  constructor() {
    effect(() => {
      const id = this.estudianteId();
      if (id) {
        void this.#cargar(id);
      }
    });
  }

  protected async enterado(anotacion: Anotacion): Promise<void> {
    this.confirmando.set(anotacion.id);
    try {
      const actualizada = await this.#servicio.enterado(anotacion.id);
      this.observador.update((o) =>
        o ? { ...o, anotaciones: o.anotaciones.map((a) => (a.id === actualizada.id ? actualizada : a)) } : o,
      );
      this.#snackBar.open('Gracias. El colegio verá que usted leyó la anotación.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.confirmando.set(null);
    }
  }

  async #cargar(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.observador.set(await this.#servicio.observador(id));
    } catch (error) {
      this.observador.set(null);
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}

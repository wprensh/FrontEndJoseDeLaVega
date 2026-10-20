import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ESTADOS_ELECCION, Eleccion, infoCargo } from '../../../core/models/eleccion.model';
import { EleccionesService } from '../../../core/services/elecciones.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { EleccionDialogComponent } from './eleccion-dialog.component';

/** Elecciones del gobierno escolar: una tarjeta por jornada, con su estado y participación. */
@Component({
  selector: 'app-elecciones-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, BarraAdminComponent, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Elecciones escolares"
        subtitulo="Personero, contralor, voceros y representantes: candidatos, votación en el campus y resultados"
        etiqueta="Panel administrativo"
      />
      <app-barra-admin />

      <div class="barra">
        <h2>Jornadas electorales</h2>
        @if (sesion.puede('Elecciones', 'Crear')) {
          <button mat-flat-button class="boton-azul" type="button" (click)="nueva()">
            <mat-icon aria-hidden="true">add</mat-icon>
            Nueva elección
          </button>
        }
      </div>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando elecciones" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }} <button mat-button type="button" (click)="cargar()">Reintentar</button></p>
      }

      <ul class="elecciones">
        @for (e of elecciones(); track e.id) {
          <li>
            <a class="tarjeta-franja franja-amarilla eleccion" [routerLink]="['/admin/elecciones', e.id]">
              <span class="estado" [attr.data-estado]="e.estado">{{ estados[e.estado] }}</span>
              <h3>{{ e.nombre }}</h3>
              <p class="fechas">
                <mat-icon aria-hidden="true">schedule</mat-icon>
                {{ e.inicio | date: "EEEE d 'de' MMMM, h:mm a" }} a {{ e.fin | date: 'h:mm a' }}
                @if (!mismoDia(e)) {
                  del {{ e.fin | date: "d 'de' MMMM" }}
                }
              </p>
              <ul class="cargos">
                @for (c of e.cargos; track c) {
                  <li>{{ nombreCargo(c) }}</li>
                }
              </ul>
              <p class="cifras">
                <span><strong>{{ e.totalCandidatos }}</strong> candidatos</span>
                <span><strong>{{ e.totalVotantes }}</strong> estudiantes han votado</span>
              </p>
            </a>
          </li>
        } @empty {
          @if (!cargando() && !error()) {
            <li class="tarjeta vacio">
              <mat-icon aria-hidden="true">how_to_vote</mat-icon>
              <p>
                Aún no hay elecciones. Antes de crear una, registre a los estudiantes en
                <a routerLink="/admin/comunidad">Estudiantes y docentes</a>: de allí salen los candidatos y los votantes.
              </p>
            </li>
          }
        }
      </ul>
    </div>
  `,
  styles: `
    .barra {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-block-end: 1rem;

      h2 {
        margin: 0;
        font-size: 1.1rem;
      }
    }

    .elecciones {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .eleccion {
      display: grid;
      gap: 0.5rem;
      block-size: 100%;
      color: inherit;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover,
      &:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgb(10 38 71 / 14%);
      }

      h3 {
        margin: 0;
        color: var(--jv-azul);
        font-size: 1.15rem;
      }
    }

    .estado {
      justify-self: start;
      padding: 0.1rem 0.65rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      background: #e7edf7;
      color: var(--jv-azul);

      &[data-estado='Abierta'] {
        background: #dcf5e3;
        color: #1e7a3c;
      }

      &[data-estado='Cerrada'] {
        background: #eceff3;
        color: var(--jv-texto-suave);
      }
    }

    .fechas {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;

      mat-icon {
        font-size: 18px;
        inline-size: 18px;
        block-size: 18px;
      }
    }

    .cargos {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        padding: 0.1rem 0.55rem;
        border-radius: 999px;
        background: var(--jv-superficie-suave);
        border: 1px solid var(--jv-borde);
        font-size: 0.78rem;
      }
    }

    .cifras {
      display: flex;
      gap: 1.25rem;
      margin: 0;
      font-size: 0.9rem;

      strong {
        color: var(--jv-azul);
        font-size: 1.1rem;
      }
    }

    .vacio {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      grid-column: 1 / -1;

      mat-icon {
        color: var(--jv-azul-medio);
      }

      p {
        margin: 0;
      }
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class EleccionesAdminComponent implements OnInit {
  readonly #servicio = inject(EleccionesService);
  readonly #dialog = inject(MatDialog);
  readonly #router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected readonly estados = ESTADOS_ELECCION;
  protected readonly elecciones = signal<Eleccion[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.elecciones.set(await this.#servicio.listar());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected nombreCargo(cargo: Eleccion['cargos'][number]): string {
    return infoCargo(cargo).nombre;
  }

  protected mismoDia(e: Eleccion): boolean {
    return new Date(e.inicio).toDateString() === new Date(e.fin).toDateString();
  }

  protected async nueva(): Promise<void> {
    const creada = await firstValueFrom(
      this.#dialog
        .open<EleccionDialogComponent, null, Eleccion>(EleccionDialogComponent, { data: null, width: '640px', maxWidth: '95vw' })
        .afterClosed(),
    );
    if (creada) {
      void this.#router.navigate(['/admin/elecciones', creada.id]);
    }
  }
}

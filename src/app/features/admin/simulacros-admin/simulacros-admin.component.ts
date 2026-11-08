import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { nombreGrado } from '../../../core/models/campus.model';
import { ESTADOS_SIMULACRO, Simulacro, TIPOS_PRUEBA } from '../../../core/models/simulacro.model';
import { SesionService } from '../../../core/services/sesion.service';
import { SimulacrosService } from '../../../core/services/simulacros.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { SimulacroDialogComponent } from './simulacro-dialog.component';

/** Lista de simulacros con su estado, preguntas y participación. */
@Component({
  selector: 'app-simulacros-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Simulacros Saber"
        subtitulo="Pruebas tipo ICFES en el campus: Saber 11, 9°, 5° y 3°"
        etiqueta="Panel administrativo"
      />

      <section class="tarjeta">
        <div class="barra">
          <p class="ayuda">
            Cree el simulacro, cargue las preguntas (puede pegarlas como texto) y los estudiantes de los grados elegidos lo
            presentan en el campus dentro del horario. Los resultados se calculan al entregar.
          </p>
          @if (sesion.puede('Simulacros', 'Crear')) {
            <button mat-flat-button class="boton-azul" type="button" (click)="nuevo()">
              <mat-icon aria-hidden="true">add</mat-icon>
              Nuevo simulacro
            </button>
          }
        </div>

        @if (cargando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
        }
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
        }

        <table class="tabla">
          <thead>
            <tr>
              <th scope="col">Simulacro</th>
              <th scope="col">Grados</th>
              <th scope="col">Horario</th>
              <th scope="col">Preguntas</th>
              <th scope="col">Entregados</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="visualmente-oculto">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (s of simulacros(); track s.id) {
              <tr>
                <th scope="row">
                  <a [routerLink]="['/admin/simulacros', s.id]">{{ s.titulo }}</a>
                  <span class="detalle">{{ tipos[s.tipo] }} · {{ s.duracionMinutos }} min</span>
                </th>
                <td>{{ grados(s.grados) }}</td>
                <td>{{ s.inicio | date: 'd MMM, h:mm a' }}<span class="detalle">a {{ s.fin | date: 'd MMM, h:mm a' }}</span></td>
                <td [class.alerta]="s.totalPreguntas === 0">{{ s.totalPreguntas }}</td>
                <td>{{ s.presentados }}</td>
                <td><span class="estado" [attr.data-estado]="s.estado">{{ estados[s.estado] }}</span></td>
                <td class="acciones">
                  <a mat-icon-button [routerLink]="['/admin/simulacros', s.id]" matTooltip="Preguntas y resultados" aria-label="Abrir">
                    <mat-icon>open_in_new</mat-icon>
                  </a>
                  @if (sesion.puede('Simulacros', 'Eliminar')) {
                    <button mat-icon-button type="button" matTooltip="Eliminar" aria-label="Eliminar" (click)="eliminar(s)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              @if (!cargando()) {
                <tr><td colspan="7" class="vacio">Aún no hay simulacros.</td></tr>
              }
            }
          </tbody>
        </table>
      </section>
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
    }

    .tabla {
      inline-size: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 0.55rem 0.6rem;
        border-block-end: 1px solid var(--jv-borde);
        text-align: start;
      }

      thead th {
        color: var(--jv-texto-suave);
        font-size: 0.85rem;
        font-weight: 600;
      }

      a {
        color: var(--jv-azul);
        font-weight: 700;
      }

      .detalle {
        display: block;
        color: var(--jv-texto-suave);
        font-size: 0.82rem;
        font-weight: 400;
      }

      .acciones {
        text-align: end;
        white-space: nowrap;
      }

      .alerta {
        color: var(--jv-rojo);
        font-weight: 700;
      }

      .vacio {
        padding: 2rem;
        color: var(--jv-texto-suave);
        text-align: center;
      }
    }

    .estado {
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--jv-superficie-suave);
      border: 1px solid var(--jv-borde);
      font-size: 0.8rem;
      font-weight: 600;

      &[data-estado='Abierto'] {
        background: #e5f5ec;
        border-color: #b9e2c9;
      }
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class SimulacrosAdminComponent implements OnInit {
  readonly #servicio = inject(SimulacrosService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected readonly tipos = TIPOS_PRUEBA;
  protected readonly estados = ESTADOS_SIMULACRO;
  protected readonly simulacros = signal<Simulacro[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.recargar();
  }

  protected async recargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.simulacros.set(await this.#servicio.listar());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected grados(grados: readonly number[]): string {
    return grados.map(nombreGrado).join(', ');
  }

  protected async nuevo(): Promise<void> {
    const creado = await firstValueFrom(
      this.#dialog
        .open<SimulacroDialogComponent, Simulacro | null, Simulacro>(SimulacroDialogComponent, {
          data: null,
          width: '640px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (creado) {
      this.#snackBar.open('Simulacro creado. Ahora cargue las preguntas.', 'Cerrar', { duration: 4000 });
      await this.#router.navigate(['/admin/simulacros', creado.id]);
    }
  }

  protected async eliminar(s: Simulacro): Promise<void> {
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Eliminar simulacro',
            mensaje: `¿Eliminar «${s.titulo}»? Si ya alguien lo presentó, no se puede eliminar.`,
            confirmar: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (!confirmado) {
      return;
    }
    try {
      await this.#servicio.eliminar(s.id);
      this.simulacros.update((lista) => lista.filter((x) => x.id !== s.id));
      this.#snackBar.open('Simulacro eliminado.', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }
}

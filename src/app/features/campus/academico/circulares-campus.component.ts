import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CircularCampus } from '../../../core/models/comunicaciones.model';
import { CampusAcademicoService } from '../../../core/services/campus-academico.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Circulares publicadas para quien ingresa. Abrir una registra la lectura; algunas piden confirmación. */
@Component({
  selector: 'app-circulares-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatExpansionModule, MatIconModule, MatProgressBarModule, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Circulares" subtitulo="Comunicados oficiales de la institución" icono="campaign" />

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }

      @if (circulares(); as lista) {
        <mat-accordion multi>
          @for (c of lista; track c.id) {
            <mat-expansion-panel (opened)="abrir(c)">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  @if (!c.leida) {
                    <span class="nueva" aria-label="Sin leer"></span>
                  }
                  {{ c.titulo }}
                </mat-panel-title>
                <mat-panel-description>{{ c.codigo }} · {{ c.publicadaEn | date: 'd MMM y' }}</mat-panel-description>
              </mat-expansion-panel-header>

              <div class="contenido">{{ c.contenido }}</div>
              @if (c.enlaceAdjunto) {
                <a mat-stroked-button [href]="c.enlaceAdjunto" target="_blank" rel="noopener">
                  <mat-icon aria-hidden="true">attach_file</mat-icon>
                  Ver documento adjunto
                </a>
              }
              @if (c.requiereConfirmacion) {
                <div class="confirmacion">
                  @if (c.confirmada) {
                    <span class="confirmada"><mat-icon aria-hidden="true">verified</mat-icon> Usted confirmó que recibió esta circular.</span>
                  } @else {
                    <span>El colegio le pide confirmar que recibió y leyó esta circular.</span>
                    <button mat-flat-button class="boton-institucional" type="button" [disabled]="confirmando() === c.id" (click)="confirmar(c)">
                      Confirmo que la leí
                    </button>
                  }
                </div>
              }
            </mat-expansion-panel>
          } @empty {
            <p class="tarjeta vacio">No hay circulares publicadas.</p>
          }
        </mat-accordion>
      } @else if (!error()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando circulares" />
      }
    </div>
  `,
  styles: `
    .nueva {
      display: inline-block;
      inline-size: 0.6rem;
      block-size: 0.6rem;
      margin-inline-end: 0.5rem;
      border-radius: 50%;
      background: var(--jv-rojo);
    }

    .contenido {
      margin-block-end: 1rem;
      white-space: pre-line;
      line-height: 1.6;
    }

    .confirmacion {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-block-start: 1rem;
      padding: 0.8rem 1rem;
      background: #fff7d6;
      border-radius: var(--jv-radio);
    }

    .confirmada {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: #0f7b3f;
      font-weight: 600;
    }

    .vacio {
      color: var(--jv-texto-suave);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class CircularesCampusComponent {
  readonly #servicio = inject(CampusAcademicoService);
  readonly #snackBar = inject(MatSnackBar);

  protected readonly circulares = signal<CircularCampus[] | null>(null);
  protected readonly confirmando = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.#servicio
      .circulares()
      .then((lista) => this.circulares.set(lista))
      .catch((error: unknown) => this.error.set(mensajeDeError(error)));
  }

  protected async abrir(circular: CircularCampus): Promise<void> {
    if (circular.leida) {
      return;
    }
    try {
      this.#reemplazar(await this.#servicio.leerCircular(circular.id, false));
    } catch {
      // La lectura se vuelve a registrar la próxima vez que la abra.
    }
  }

  protected async confirmar(circular: CircularCampus): Promise<void> {
    this.confirmando.set(circular.id);
    try {
      this.#reemplazar(await this.#servicio.leerCircular(circular.id, true));
      this.#snackBar.open('Confirmación enviada al colegio.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.confirmando.set(null);
    }
  }

  #reemplazar(actualizada: CircularCampus): void {
    this.circulares.update((lista) => lista?.map((c) => (c.id === actualizada.id ? actualizada : c)) ?? null);
  }
}

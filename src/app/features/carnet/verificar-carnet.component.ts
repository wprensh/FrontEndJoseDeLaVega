import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { INSTITUCION } from '../../core/institucion';
import { ROLES_CAMPUS, VerificacionCarnet, cursoDe } from '../../core/models/campus.model';
import { ComunidadService } from '../../core/services/comunidad.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { EscudoComponent } from '../../shared/escudo/escudo.component';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

type Resultado =
  | { readonly estado: 'encontrado'; readonly carnet: VerificacionCarnet }
  | { readonly estado: 'inexistente'; readonly codigo: string }
  | { readonly estado: 'error'; readonly mensaje: string };

/** Verificación pública del carné: el QR del carné apunta a /carnet/{codigo}. */
@Component({
  selector: 'app-verificar-carnet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    EscudoComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Verificar carné"
        subtitulo="Confirme que un carné estudiantil o docente es auténtico y está vigente"
        [etiqueta]="institucion.nombreCorto"
      />

      <section class="tarjeta">
        <form class="buscar" (ngSubmit)="buscar()">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Código del carné</mat-label>
            <input matInput name="codigo" maxlength="20" [(ngModel)]="texto" placeholder="Escanee el QR o escriba el código" />
          </mat-form-field>
          <button mat-flat-button class="boton-azul" type="submit" [disabled]="consultando()">Verificar</button>
        </form>
        @if (consultando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Consultando" />
        }

        @if (resultado(); as r) {
          <div class="resultado" role="status">
            @switch (r.estado) {
              @case ('encontrado') {
                <div class="carnet" [class.vencido]="!r.carnet.vigente">
                  <app-escudo [tamano]="64" />
                  <div>
                    <p class="sello">
                      <mat-icon aria-hidden="true">{{ r.carnet.vigente ? 'verified' : 'error' }}</mat-icon>
                      {{ r.carnet.vigente ? 'Carné vigente' : 'Carné no vigente' }}
                    </p>
                    <p class="nombre">{{ r.carnet.nombreCompleto }}</p>
                    <p>
                      {{ roles[r.carnet.rol] }}@if (curso(r.carnet); as c) { · {{ c }}} · Documento {{ r.carnet.documentoParcial }}
                    </p>
                    <p class="detalle">Año lectivo {{ r.carnet.anioLectivo }} · Código {{ r.carnet.codigo }}</p>
                  </div>
                </div>
                @if (!r.carnet.vigente) {
                  <p class="detalle">La persona ya no está activa en la institución. Comuníquese con secretaría si necesita confirmarlo.</p>
                }
              }
              @case ('inexistente') {
                <p class="no-encontrado">
                  <mat-icon aria-hidden="true">gpp_bad</mat-icon>
                  No existe un carné con el código <strong>{{ r.codigo }}</strong>. El documento podría no ser auténtico.
                </p>
              }
              @case ('error') {
                <p class="aviso-error">{{ r.mensaje }}</p>
              }
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .buscar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block-end: 1rem;

      mat-form-field {
        flex: 1 1 16rem;
      }
    }

    .carnet {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 2px solid #8fd0aa;
      border-radius: var(--jv-radio);
      background: #f1faf5;

      p {
        margin: 0.1rem 0;
      }

      &.vencido {
        border-color: #f2b8b8;
        background: #fdf3f3;

        .sello {
          color: var(--jv-rojo);
        }
      }
    }

    .sello {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      color: #0f7b3f;
      font-weight: 800;
      text-transform: uppercase;
    }

    .nombre {
      color: var(--jv-azul);
      font: 800 1.3rem / 1.2 var(--jv-fuente-titulos);
    }

    .detalle {
      color: var(--jv-texto-suave);
      font-size: 0.88rem;
    }

    .no-encontrado {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--jv-rojo);
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class VerificarCarnetComponent {
  readonly #servicio = inject(ComunidadService);
  readonly #router = inject(Router);

  /** Código desde la URL (/carnet/ABC123), así funciona el QR. */
  readonly codigo = input<string>();

  protected readonly institucion = INSTITUCION;
  protected readonly roles = ROLES_CAMPUS;
  protected readonly consultando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);
  protected texto = '';

  constructor() {
    effect(() => {
      const codigo = this.codigo();
      untracked(() => {
        if (codigo) {
          this.texto = codigo;
          void this.#consultar(codigo);
        }
      });
    });
  }

  protected curso(c: VerificacionCarnet): string {
    return cursoDe(c);
  }

  protected buscar(): void {
    const codigo = this.texto.trim().toUpperCase();
    if (!codigo) {
      return;
    }
    // Deja el código en la URL para poder compartir el enlace.
    void this.#router.navigate(['/carnet', codigo]);
    if (codigo === this.codigo()) {
      void this.#consultar(codigo);
    }
  }

  async #consultar(codigo: string): Promise<void> {
    this.consultando.set(true);
    this.resultado.set(null);
    try {
      this.resultado.set({ estado: 'encontrado', carnet: await this.#servicio.verificarCarnet(codigo) });
    } catch (error) {
      this.resultado.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? { estado: 'inexistente', codigo }
          : { estado: 'error', mensaje: mensajeDeError(error) },
      );
    } finally {
      this.consultando.set(false);
    }
  }
}

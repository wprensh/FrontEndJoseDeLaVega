import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';

import { GRADOS, MiembroCampus, RolCampus, nombreGrado } from '../../../core/models/campus.model';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { CarnetComponent } from '../../../shared/carnet/carnet.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/** Clase del <body> que deja solo la hoja al imprimir (ver styles.scss). */
const CLASE_IMPRESION = 'imprimiendo-claves';

/** Módulo Carné con QR: genera e imprime los carnés por curso y verifica un código. */
@Component({
  selector: 'app-carnes-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    BarraAdminComponent,
    CarnetComponent,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <div class="no-imprimir">
        <app-page-heading
          titulo="Carné con QR"
          subtitulo="Carnés de estudiantes y docentes con código QR que cualquiera puede verificar"
          etiqueta="Panel administrativo"
        />
        <app-barra-admin />

        <div class="rejilla">
          <section class="tarjeta">
            <h2>Generar carnés</h2>
            <form class="filtros" (ngSubmit)="generar()">
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Para</mat-label>
                <mat-select name="rol" [(ngModel)]="rol">
                  <mat-option value="Estudiante">Estudiantes</mat-option>
                  <mat-option value="Docente">Docentes</mat-option>
                </mat-select>
              </mat-form-field>
              @if (rol === 'Estudiante') {
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>Grado</mat-label>
                  <mat-select name="grado" [(ngModel)]="grado">
                    <mat-option [value]="null">Todos</mat-option>
                    @for (g of grados; track g) {
                      <mat-option [value]="g">{{ nombreGrado(g) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic" class="corto">
                  <mat-label>Grupo</mat-label>
                  <input matInput name="grupo" maxlength="10" [(ngModel)]="grupo" placeholder="A" />
                </mat-form-field>
              }
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Nombre o documento (opcional)</mat-label>
                <input matInput name="buscar" [(ngModel)]="buscar" />
              </mat-form-field>
              <button mat-flat-button class="boton-azul" type="submit" [disabled]="cargando()">
                <mat-icon aria-hidden="true">badge</mat-icon>
                Generar
              </button>
            </form>
            <p class="ayuda">
              Cada carné lleva un QR que abre la verificación pública. Si la persona se retira o se desactiva en
              «Comunidad del campus», el carné aparece como no vigente. Cada estudiante y docente también ve su carné en el campus.
            </p>
          </section>

          <section class="tarjeta">
            <h2>Verificar un carné</h2>
            <form class="filtros" (ngSubmit)="verificar()">
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Código del carné</mat-label>
                <input matInput name="codigo" maxlength="20" [(ngModel)]="codigo" />
              </mat-form-field>
              <button mat-stroked-button type="submit">Verificar</button>
            </form>
            <p class="ayuda">También funciona escaneando el QR con la cámara del celular.</p>
          </section>
        </div>

        @if (cargando()) {
          <mat-progress-bar mode="indeterminate" aria-label="Generando carnés" />
        }
        @if (error(); as e) {
          <p class="aviso-error" role="alert">{{ e }}</p>
        }
      </div>

      @if (carnes(); as lista) {
        <section class="hoja" aria-labelledby="titulo-hoja">
          <div class="barra no-imprimir">
            <h2 id="titulo-hoja">Carnés ({{ lista.length }})</h2>
            <button mat-flat-button class="boton-azul" type="button" [disabled]="!lista.length" (click)="imprimir()">
              <mat-icon aria-hidden="true">print</mat-icon>
              Imprimir
            </button>
          </div>
          <p class="aviso no-imprimir" role="note">
            <mat-icon aria-hidden="true">info</mat-icon>
            Tamaño tarjeta (85,6 × 54 mm), diez por hoja carta. Imprima en cartulina y plastifique.
          </p>
          <div class="carnes">
            @for (m of lista; track m.id) {
              <app-carnet [datos]="m" />
            } @empty {
              <p>No hay personas activas con estos filtros.</p>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .rejilla {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
      margin-block-end: 1rem;

      @media (width < 900px) {
        grid-template-columns: 1fr;
      }
    }

    h2 {
      margin: 0 0 0.75rem;
      color: var(--jv-azul);
      font-size: 1.1rem;
    }

    .filtros {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;

      .corto {
        inline-size: 7rem;
      }
    }

    .ayuda {
      margin: 0.75rem 0 0;
      color: var(--jv-texto-suave);
      font-size: 0.9rem;
    }

    .hoja {
      margin-block-start: 1rem;

      .barra {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-block-end: 0.75rem;

        h2 {
          margin: 0 auto 0 0;
        }
      }

      .aviso {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0.9rem;
        border-radius: var(--jv-radio);
        background: #eef4fc;
      }
    }

    .carnes {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;

      @media print {
        gap: 4mm;
      }
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class CarnesAdminComponent {
  readonly #servicio = inject(ComunidadService);
  readonly #router = inject(Router);

  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected rol: RolCampus = 'Estudiante';
  protected grado: number | null = null;
  protected grupo = '';
  protected buscar = '';
  protected codigo = '';

  protected readonly carnes = signal<MiembroCampus[] | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async generar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const esEstudiante = this.rol === 'Estudiante';
      const miembros = await this.#servicio.todos({
        rol: this.rol,
        grado: esEstudiante ? (this.grado ?? undefined) : undefined,
        grupo: esEstudiante ? this.grupo.trim() || undefined : undefined,
        buscar: this.buscar.trim() || undefined,
      });
      this.carnes.set(miembros.filter((m) => m.activo));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected verificar(): void {
    const codigo = this.codigo.trim().toUpperCase();
    if (codigo) {
      void this.#router.navigate(['/carnet', codigo]);
    }
  }

  protected imprimir(): void {
    document.body.classList.add(CLASE_IMPRESION);
    window.addEventListener('afterprint', () => document.body.classList.remove(CLASE_IMPRESION), { once: true });
    window.print();
  }
}

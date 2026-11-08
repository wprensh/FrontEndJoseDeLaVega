import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { CampusService } from '../../../core/services/campus.service';
import { CarnetComponent, DatosCarnet } from '../../../shared/carnet/carnet.component';
import { EncabezadoCampusComponent } from '../compartido/encabezado-campus.component';

/** Carné digital de quien ingresa: se muestra en el celular en la portería o se imprime. */
@Component({
  selector: 'app-carnet-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, CarnetComponent, EncabezadoCampusComponent],
  template: `
    <div class="contenedor">
      <app-encabezado-campus titulo="Carné digital" subtitulo="Muéstrelo desde el celular o imprímalo" icono="badge">
        <button mat-flat-button class="boton-azul" type="button" (click)="imprimir()">
          <mat-icon aria-hidden="true">print</mat-icon>
          Imprimir
        </button>
      </app-encabezado-campus>

      @if (datos(); as d) {
        <div class="carnet-grande">
          <app-carnet [datos]="d" />
        </div>
        <p class="ayuda no-imprimir">
          El código QR abre la página de verificación del colegio, donde se confirma que el carné está vigente.
          Si cambian sus datos o deja de pertenecer a la institución, el carné deja de ser válido.
        </p>
      }
    </div>
  `,
  styles: `
    .carnet-grande {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;

      app-carnet {
        zoom: 1.25;
      }
    }

    .ayuda {
      max-inline-size: 40rem;
      margin-inline: auto;
      color: var(--jv-texto-suave);
      text-align: center;
    }

    @media (max-width: 480px) {
      .carnet-grande app-carnet {
        zoom: 1;
      }
    }
  `,
})
export class CarnetCampusComponent {
  readonly #campus = inject(CampusService);

  protected readonly datos = computed<DatosCarnet | null>(() => {
    const p = this.#campus.perfil();
    return p
      ? {
          nombreCompleto: p.nombreCompleto,
          documento: p.documento,
          rol: p.rol,
          grado: p.grado,
          grupo: p.grupo,
          codigoCarnet: p.codigoCarnet,
        }
      : null;
  });

  protected imprimir(): void {
    window.print();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ROLES_CAMPUS, enlaceWhatsApp } from '../../../core/models/campus.model';
import { Circular, PendienteCircular } from '../../../core/models/comunicaciones.model';
import { ComunicacionesService } from '../../../core/services/comunicaciones.service';
import { descargarCsv } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';

/** Quiénes no han leído (o confirmado) una circular, con recordatorio por WhatsApp. */
@Component({
  selector: 'app-pendientes-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Pendientes · {{ circular.codigo }}</h2>
    <mat-dialog-content>
      <p class="resumen">
        {{ circular.leidas }} de {{ circular.destinatarios }} la leyeron
        @if (circular.requiereConfirmacion) {
          · {{ circular.confirmadas }} confirmaron
        }
      </p>
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando" />
      }
      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      <ul>
        @for (p of lista(); track p.miembroId) {
          <li>
            <span>
              <strong>{{ p.nombreCompleto }}</strong>
              <span class="detalle">{{ roles[p.rol] }}@if (p.curso) { · {{ p.curso }}} · {{ p.leida ? 'leída sin confirmar' : 'sin leer' }}</span>
            </span>
            @if (whatsapp(p); as w) {
              <a mat-stroked-button [href]="w" target="_blank" rel="noopener" class="whatsapp">
                <mat-icon aria-hidden="true">chat</mat-icon>
                Recordar
              </a>
            } @else {
              <span class="detalle">sin teléfono</span>
            }
          </li>
        } @empty {
          @if (!cargando()) {
            <li class="vacio">Todos la leyeron. 🎉</li>
          }
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button type="button" (click)="exportar()" [disabled]="!lista().length">Exportar CSV</button>
      <span class="espacio"></span>
      <button mat-button type="button" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .resumen {
      margin-block-start: 0;
      color: var(--jv-texto-suave);
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-block: 0.45rem;
      border-block-end: 1px solid var(--jv-borde);
    }

    .detalle {
      display: block;
      color: var(--jv-texto-suave);
      font-size: 0.85rem;
    }

    .whatsapp {
      flex: none;
      color: #128c4a;
    }

    .vacio {
      justify-content: center;
      padding: 1.5rem;
      color: var(--jv-texto-suave);
    }

    .espacio {
      flex: 1;
    }

    .aviso-error {
      color: var(--jv-rojo);
    }
  `,
})
export class PendientesDialogComponent {
  readonly #servicio = inject(ComunicacionesService);
  protected readonly circular = inject<Circular>(MAT_DIALOG_DATA);
  protected readonly roles = ROLES_CAMPUS;
  protected readonly lista = signal<PendienteCircular[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = computed(
    () =>
      `Buen día. Le recordamos leer la ${this.circular.codigo} «${this.circular.titulo}» en el campus virtual de la I.E. José De La Vega` +
      (this.circular.requiereConfirmacion ? ' y marcar «Enterado».' : '.'),
  );

  constructor() {
    this.#servicio
      .pendientes(this.circular.id)
      .then((l) => this.lista.set(l))
      .catch((e: unknown) => this.error.set(mensajeDeError(e)))
      .finally(() => this.cargando.set(false));
  }

  protected whatsapp(p: PendienteCircular): string | null {
    return enlaceWhatsApp(p.telefono, this.mensaje());
  }

  protected exportar(): void {
    descargarCsv(
      `pendientes-${this.circular.codigo}.csv`,
      ['Nombre', 'Rol', 'Curso', 'Teléfono', 'Estado'],
      this.lista().map((p) => [p.nombreCompleto, ROLES_CAMPUS[p.rol], p.curso, p.telefono, p.leida ? 'Leída sin confirmar' : 'Sin leer']),
    );
  }
}

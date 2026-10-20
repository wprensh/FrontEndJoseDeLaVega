import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { cursoDe } from '../../../core/models/campus.model';
import {
  CARGOS,
  Candidato,
  CargoEleccion,
  ESTADOS_ELECCION,
  Eleccion,
  Resultados,
  infoCargo,
} from '../../../core/models/eleccion.model';
import { EleccionesService } from '../../../core/services/elecciones.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { FotoCandidatoComponent } from '../../../shared/elecciones/foto-candidato.component';
import { ResultadosEleccionComponent } from '../../../shared/elecciones/resultados-eleccion.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { CandidatoDialogComponent, CandidatoDialogData } from './candidato-dialog.component';
import { EleccionDialogComponent } from './eleccion-dialog.component';

/** Cada cuánto se actualizan los resultados mientras la votación está abierta. */
const REFRESCO_MS = 30_000;

/** Una elección: candidatos por cargo y contienda, y resultados en vivo. */
@Component({
  selector: 'app-eleccion-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatTooltipModule,
    BarraAdminComponent,
    FotoCandidatoComponent,
    PageHeadingComponent,
    ResultadosEleccionComponent,
  ],
  templateUrl: './eleccion-detalle.component.html',
  styleUrl: './eleccion-detalle.component.scss',
})
export class EleccionDetalleComponent {
  /** Id de la ruta /admin/elecciones/:id. */
  readonly id = input.required<string>();

  readonly #servicio = inject(EleccionesService);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected readonly estados = ESTADOS_ELECCION;
  protected readonly cursoDe = cursoDe;
  protected readonly eleccion = signal<Eleccion | null>(null);
  protected readonly candidatos = signal<Candidato[]>([]);
  protected readonly resultados = signal<Resultados | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pestana = signal(0);

  /** Con votos ya no se agregan ni retiran candidatos. */
  protected readonly bloqueada = computed(() => (this.eleccion()?.totalVotantes ?? 0) > 0);

  /** Cargos de la elección, cada uno con sus candidatos agrupados por contienda (grado, curso...). */
  protected readonly secciones = computed(() => {
    const eleccion = this.eleccion();
    if (!eleccion) {
      return [];
    }
    return CARGOS.filter((c) => eleccion.cargos.includes(c.cargo)).map((info) => {
      const delCargo = this.candidatos().filter((c) => c.cargo === info.cargo);
      const contiendas = [...new Set(delCargo.map((c) => c.nombreAmbito))].map((ambito) => ({
        ambito,
        candidatos: delCargo.filter((c) => c.nombreAmbito === ambito),
      }));
      return { info, contiendas, total: delCargo.length };
    });
  });

  constructor() {
    effect(() => void this.cargar(this.id()));

    // Resultados en vivo mientras se mira esa pestaña y la votación está abierta.
    const reloj = setInterval(() => {
      if (this.pestana() === 1 && this.eleccion()?.estado === 'Abierta') {
        void this.cargarResultados();
      }
    }, REFRESCO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected async cargar(id = this.id()): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [eleccion, candidatos] = await Promise.all([this.#servicio.obtener(id), this.#servicio.candidatos(id)]);
      this.eleccion.set(eleccion);
      this.candidatos.set(candidatos);
      if (this.pestana() === 1) {
        await this.cargarResultados();
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async cargarResultados(): Promise<void> {
    try {
      this.resultados.set(await this.#servicio.resultados(this.id()));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected cambiarPestana(indice: number): void {
    this.pestana.set(indice);
    if (indice === 1) {
      void this.cargarResultados();
    }
  }

  protected async editar(): Promise<void> {
    const actualizada = await firstValueFrom(
      this.#dialog
        .open<EleccionDialogComponent, Eleccion, Eleccion>(EleccionDialogComponent, {
          data: this.eleccion(),
          width: '640px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (actualizada) {
      this.eleccion.set(actualizada);
      this.#snackBar.open('Elección actualizada.', 'Cerrar');
    }
  }

  protected async eliminar(): Promise<void> {
    const eleccion = this.eleccion()!;
    if (!(await this.#confirmar('Eliminar elección', `¿Desea eliminar "${eleccion.nombre}" y sus candidatos?`, 'Eliminar'))) {
      return;
    }
    try {
      await this.#servicio.eliminar(eleccion.id);
      this.#snackBar.open('Elección eliminada.', 'Cerrar');
      void this.#router.navigate(['/admin/elecciones']);
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected async inscribir(cargo: CargoEleccion): Promise<void> {
    const creado = await this.#abrirCandidato({ eleccionId: this.id(), cargo });
    if (creado) {
      this.#snackBar.open(`${creado.nombreCompleto} inscrito como candidato.`, 'Cerrar');
      await this.cargar();
    }
  }

  protected async editarCandidato(candidato: Candidato): Promise<void> {
    const actualizado = await this.#abrirCandidato({ eleccionId: this.id(), cargo: candidato.cargo, candidato });
    if (actualizado) {
      this.candidatos.update((lista) => lista.map((c) => (c.id === actualizado.id ? actualizado : c)));
      this.#snackBar.open('Perfil actualizado.', 'Cerrar');
    }
  }

  protected async retirar(candidato: Candidato): Promise<void> {
    const cargo = infoCargo(candidato.cargo).nombre;
    if (!(await this.#confirmar('Retirar candidato', `¿Retirar a ${candidato.nombreCompleto} como candidato a ${cargo}?`, 'Retirar'))) {
      return;
    }
    try {
      await this.#servicio.eliminarCandidato(this.id(), candidato.id);
      this.#snackBar.open('Candidato retirado.', 'Cerrar');
      await this.cargar();
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  protected curso(c: Candidato): string {
    return cursoDe({ rol: 'Estudiante', grado: c.grado, grupo: c.grupo });
  }

  #abrirCandidato(data: CandidatoDialogData): Promise<Candidato | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<CandidatoDialogComponent, CandidatoDialogData, Candidato>(CandidatoDialogComponent, {
          data,
          width: '640px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
  }

  async #confirmar(titulo: string, mensaje: string, confirmar: string): Promise<boolean> {
    return (
      (await firstValueFrom(
        this.#dialog
          .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
            data: { titulo, mensaje, confirmar },
          })
          .afterClosed(),
      )) === true
    );
  }
}

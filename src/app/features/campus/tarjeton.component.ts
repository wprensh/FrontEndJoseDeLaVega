import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { cursoDe } from '../../core/models/campus.model';
import { Candidato, CargoEleccion, ESTADOS_ELECCION, Tarjeton, infoCargo } from '../../core/models/eleccion.model';
import { CampusService } from '../../core/services/campus.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { FotoCandidatoComponent } from '../../shared/elecciones/foto-candidato.component';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/** Opción marcada en una contienda: un candidato o el voto en blanco. */
const BLANCO = 'blanco';

/** Segundos tras votar antes de cerrar la sesión (los equipos de la sala se comparten). */
const SEGUNDOS_PARA_SALIR = 20;

/**
 * Tarjetón electoral del campus. El estudiante marca una opción por cargo (un candidato o en blanco),
 * revisa su elección y la confirma; después la sesión se cierra sola para el siguiente estudiante.
 * Los docentes, y los estudiantes fuera del horario, ven a los candidatos sin poder votar.
 */
@Component({
  selector: 'app-tarjeton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, FotoCandidatoComponent, PageHeadingComponent],
  templateUrl: './tarjeton.component.html',
  styleUrl: './tarjeton.component.scss',
})
export class TarjetonComponent {
  /** Id de la ruta /campus/elecciones/:id. */
  readonly id = input.required<string>();

  readonly #campus = inject(CampusService);
  readonly #router = inject(Router);

  protected readonly estados = ESTADOS_ELECCION;
  protected readonly blanco = BLANCO;
  protected readonly tarjeton = signal<Tarjeton | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Cargo → id del candidato marcado o "blanco". */
  protected readonly marcas = signal<Partial<Record<CargoEleccion, string>>>({});
  protected readonly revisando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorVoto = signal<string | null>(null);
  protected readonly votado = signal(false);
  protected readonly cuentaRegresiva = signal(SEGUNDOS_PARA_SALIR);
  /** Candidato cuyas propuestas se están leyendo. */
  protected readonly abierto = signal<string | null>(null);

  protected readonly completo = computed(() => {
    const t = this.tarjeton();
    return !!t && t.contiendas.every((c) => this.marcas()[c.cargo] !== undefined);
  });

  protected readonly resumen = computed(() =>
    (this.tarjeton()?.contiendas ?? []).map((c) => {
      const marca = this.marcas()[c.cargo];
      const candidato = c.candidatos.find((x) => x.id === marca);
      return { cargo: c.nombreCargo, eleccion: candidato ? `${candidato.numero}. ${candidato.nombreCompleto}` : 'Voto en blanco' };
    }),
  );

  constructor() {
    effect(() => void this.cargar(this.id()));

    const reloj = setInterval(() => {
      if (this.votado()) {
        this.cuentaRegresiva.update((s) => s - 1);
        if (this.cuentaRegresiva() <= 0) {
          this.salir();
        }
      }
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  protected async cargar(id: string): Promise<void> {
    this.error.set(null);
    try {
      this.tarjeton.set(await this.#campus.tarjeton(id));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected marcar(cargo: CargoEleccion, opcion: string): void {
    if (this.tarjeton()?.puedeVotar && !this.enviando()) {
      this.marcas.update((m) => ({ ...m, [cargo]: opcion }));
    }
  }

  protected icono(cargo: CargoEleccion): string {
    return infoCargo(cargo).icono;
  }

  protected curso(c: Candidato): string {
    return cursoDe({ rol: 'Estudiante', grado: c.grado, grupo: c.grupo });
  }

  protected alternarPropuestas(id: string): void {
    this.abierto.update((actual) => (actual === id ? null : id));
  }

  protected revisar(): void {
    if (this.completo()) {
      this.errorVoto.set(null);
      this.revisando.set(true);
      queueMicrotask(() => document.getElementById('revision')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  }

  protected async confirmar(): Promise<void> {
    const t = this.tarjeton()!;
    this.enviando.set(true);
    this.errorVoto.set(null);
    try {
      await this.#campus.votar(
        t.eleccionId,
        t.contiendas.map((c) => {
          const marca = this.marcas()[c.cargo]!;
          return { cargo: c.cargo, candidatoId: marca === BLANCO ? null : marca };
        }),
      );
      this.votado.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.errorVoto.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  protected salir(): void {
    this.#campus.cerrar();
    void this.#router.navigate(['/campus']);
  }
}

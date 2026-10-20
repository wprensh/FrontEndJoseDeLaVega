import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';

import { cursoDe } from '../../core/models/campus.model';
import { ESTADOS_ELECCION, EleccionCampus } from '../../core/models/eleccion.model';
import { CampusService } from '../../core/services/campus.service';
import { mensajeDeError } from '../../core/utils/http-error';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/**
 * Plantilla 6: Campus Virtual. Estudiantes y docentes entran con su número de documento y la clave
 * de acceso que entrega el colegio. Adentro ven las elecciones escolares: los estudiantes votan
 * y los docentes siguen la participación.
 */
@Component({
  selector: 'app-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeadingComponent,
  ],
  templateUrl: './campus.component.html',
  styleUrl: './campus.component.scss',
})
export class CampusComponent {
  /** ?motivo=vencida cuando la sesión terminó sola. */
  readonly motivo = input<string>();

  readonly #fb = inject(NonNullableFormBuilder);
  protected readonly campus = inject(CampusService);

  protected readonly estados = ESTADOS_ELECCION;
  protected readonly cursoDe = cursoDe;
  protected readonly ingresando = signal(false);
  protected readonly errorIngreso = signal<string | null>(null);
  protected readonly elecciones = signal<EleccionCampus[] | null>(null);
  protected readonly errorElecciones = signal<string | null>(null);

  protected readonly formulario = this.#fb.group({
    documento: ['', Validators.required],
    clave: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.campus.activa()) {
        void this.cargarElecciones();
      }
    });
  }

  protected async ingresar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { documento, clave } = this.formulario.getRawValue();
    this.ingresando.set(true);
    this.errorIngreso.set(null);
    try {
      await this.campus.iniciarSesion(documento.trim(), clave.trim());
      this.formulario.reset();
    } catch (error) {
      this.formulario.controls.clave.reset();
      this.errorIngreso.set(mensajeDeError(error));
    } finally {
      this.ingresando.set(false);
    }
  }

  protected async cargarElecciones(): Promise<void> {
    this.errorElecciones.set(null);
    try {
      this.elecciones.set(await this.campus.elecciones());
    } catch (error) {
      this.errorElecciones.set(mensajeDeError(error));
    }
  }

  protected salir(): void {
    this.campus.cerrar();
    this.elecciones.set(null);
  }
}

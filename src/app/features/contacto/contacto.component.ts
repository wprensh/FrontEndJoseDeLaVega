import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { INSTITUCION } from '../../core/institucion';
import { PqrsRadicada, TIPOS_PQRS, TipoPqrs } from '../../core/models/pqrs.model';
import { PqrsService } from '../../core/services/pqrs.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../core/utils/http-error';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/** Plantilla 5: Contacto y atención ciudadana con formulario PQRS conectado a la API. */
@Component({
  selector: 'app-contacto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    PageHeadingComponent,
  ],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.scss',
})
export class ContactoComponent {
  readonly #pqrsService = inject(PqrsService);
  readonly #fb = inject(NonNullableFormBuilder);

  protected readonly institucion = INSTITUCION;
  protected readonly tipos = TIPOS_PQRS;

  protected readonly formulario = this.#fb.group({
    nombreCompleto: ['', [Validators.required, Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    tipo: ['Peticion' as TipoPqrs, Validators.required],
    mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly radicada = signal<PqrsRadicada | null>(null);

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    try {
      const respuesta = await this.#pqrsService.radicar(this.formulario.getRawValue());
      this.radicada.set(respuesta);
      this.formulario.reset();
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.enviando.set(false);
    }
  }

  protected nuevaSolicitud(): void {
    this.radicada.set(null);
  }
}

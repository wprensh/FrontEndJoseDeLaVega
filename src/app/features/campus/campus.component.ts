import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

/**
 * Plantilla 6: Campus Virtual.
 * El formulario de ingreso es solo la interfaz: el backend todavía no tiene autenticación.
 * Cuando exista (p. ej. JWT u OpenID Connect), conectar `ingresar()` a un AuthService.
 */
@Component({
  selector: 'app-campus',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, PageHeadingComponent],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Campus Virtual & Plataforma Académica"
        subtitulo="Ingreso a calificaciones, guías pedagógicas y portal docente"
        etiqueta="Acceso seguro SSL"
      />

      <div class="rejilla">
        <section class="acceso" aria-labelledby="titulo-acceso">
          <mat-icon class="candado" aria-hidden="true">lock</mat-icon>
          <h2 id="titulo-acceso">Portal Estudiantes & Padres</h2>
          <p>Ingrese su usuario institucional y contraseña de acceso.</p>

          <form [formGroup]="formulario" (ngSubmit)="ingresar()" novalidate>
            <mat-form-field>
              <mat-label>Usuario / N° documento</mat-label>
              <input matInput formControlName="usuario" autocomplete="username" />
              @if (formulario.controls.usuario.hasError('required')) {
                <mat-error>Ingrese su usuario.</mat-error>
              }
            </mat-form-field>
            <mat-form-field>
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" formControlName="contrasena" autocomplete="current-password" />
              @if (formulario.controls.contrasena.hasError('required')) {
                <mat-error>Ingrese su contraseña.</mat-error>
              }
            </mat-form-field>
            @if (aviso()) {
              <p class="aviso" role="status">{{ aviso() }}</p>
            }
            <button mat-flat-button class="boton-institucional" type="submit">Ingresar al campus</button>
          </form>
        </section>

        <ul class="recursos">
          <li class="tarjeta-lateral franja-azul">
            <mat-icon aria-hidden="true">description</mat-icon>
            <div>
              <h3>Consulta de Boletines</h3>
              <p>Descargue las calificaciones correspondientes al periodo lectivo.</p>
            </div>
          </li>
          <li class="tarjeta-lateral franja-amarilla">
            <mat-icon aria-hidden="true" class="naranja">auto_stories</mat-icon>
            <div>
              <h3>Guías de Aprendizaje</h3>
              <p>Material de apoyo por asignatura para primaria y secundaria.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: `
    .rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
      gap: 1.5rem;
      align-items: center;
    }
    .acceso {
      background: var(--jv-azul);
      color: #fff;
      border-radius: var(--jv-radio);
      padding: 1.75rem;
      text-align: center;

      /* Campos oscuros sobre el fondo azul */
      --mdc-outlined-text-field-input-text-color: #fff;
      --mdc-outlined-text-field-label-text-color: #c9d4e5;
      --mdc-outlined-text-field-focus-label-text-color: var(--jv-amarillo);
      --mdc-outlined-text-field-outline-color: #3b557a;
      --mdc-outlined-text-field-hover-outline-color: #c9d4e5;
      --mdc-outlined-text-field-focus-outline-color: var(--jv-amarillo);
      --mdc-outlined-text-field-caret-color: var(--jv-amarillo);
    }
    .candado { color: var(--jv-amarillo); font-size: 40px; inline-size: 40px; block-size: 40px; }
    h2 { color: #fff; margin: 0.25rem 0; font-size: 1.3rem; }
    .acceso > p { color: #c9d4e5; margin: 0 0 1rem; }
    form { display: grid; gap: 0.6rem; max-inline-size: 340px; margin-inline: auto; }
    .aviso { margin: 0; color: var(--jv-amarillo); font-size: 0.9rem; }
    .recursos { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
    .recursos li { display: flex; gap: 0.9rem; align-items: flex-start; }
    .recursos mat-icon { color: var(--jv-azul); flex: none; }
    .recursos mat-icon.naranja { color: var(--jv-naranja); }
    h3 { margin: 0 0 0.15rem; font-size: 1rem; }
    .recursos p { margin: 0; color: var(--jv-texto-suave); font-size: 0.9rem; }
  `,
})
export class CampusComponent {
  readonly #fb = inject(NonNullableFormBuilder);

  protected readonly formulario = this.#fb.group({
    usuario: ['', Validators.required],
    contrasena: ['', Validators.required],
  });

  protected readonly aviso = signal<string | null>(null);

  protected ingresar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    // Pendiente: autenticación real. Nunca se envían ni se guardan credenciales en esta versión.
    this.formulario.controls.contrasena.reset();
    this.aviso.set('El acceso al campus virtual estará disponible próximamente.');
  }
}

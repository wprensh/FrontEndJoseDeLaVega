import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { INSTITUCION } from '../../../core/institucion';
import { PATRON_CLAVE, PATRON_NOMBRE_USUARIO } from '../../../core/models/usuario.model';
import { SesionService } from '../../../core/services/sesion.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';
import { EscudoComponent } from '../../../shared/escudo/escudo.component';

/**
 * Inicio de sesión del panel administrativo. Mientras no exista ningún usuario muestra la
 * configuración inicial: con la clave de administración de Render se crea el primer superadministrador.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    EscudoComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #router = inject(Router);
  readonly #sesion = inject(SesionService);

  /** Página a la que se vuelve después de iniciar sesión (?volver=/admin/certificados). */
  readonly volver = input<string>();
  /** "vencida" cuando la API cerró la sesión. */
  readonly motivo = input<string>();

  protected readonly institucion = INSTITUCION;
  protected readonly modo = signal<'cargando' | 'ingreso' | 'configuracion'>('cargando');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verClave = signal(false);

  protected readonly formIngreso = this.#fb.group({
    usuario: ['', Validators.required],
    clave: ['', Validators.required],
    recordar: [false],
  });

  protected readonly formConfiguracion = this.#fb.group({
    claveAdministracion: ['', Validators.required],
    nombreCompleto: ['', [Validators.required, Validators.maxLength(120)]],
    correo: ['', [Validators.email, Validators.maxLength(150)]],
    nombreUsuario: ['', [Validators.required, Validators.pattern(PATRON_NOMBRE_USUARIO)]],
    clave: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
    confirmacion: ['', Validators.required],
  });

  async ngOnInit(): Promise<void> {
    if (this.#sesion.activa()) {
      await this.#irAlDestino();
      return;
    }
    if (this.motivo() === 'vencida') {
      this.error.set('Su sesión terminó. Inicie sesión de nuevo.');
    }
    try {
      const estado = await this.#sesion.estado();
      this.modo.set(estado.requiereConfiguracion ? 'configuracion' : 'ingreso');
    } catch (error) {
      // Sin respuesta (por ejemplo, la API se está despertando) se muestra el ingreso normal.
      this.modo.set('ingreso');
      this.error.set(mensajeDeError(error));
    }
  }

  protected async ingresar(): Promise<void> {
    if (this.formIngreso.invalid) {
      this.formIngreso.markAllAsTouched();
      return;
    }
    const { usuario, clave, recordar } = this.formIngreso.getRawValue();
    await this.#enviar(async () => {
      await this.#sesion.iniciarSesion(usuario.trim(), clave, recordar);
    }, () => this.formIngreso.controls.clave.reset());
  }

  protected async configurar(): Promise<void> {
    const valor = this.formConfiguracion.getRawValue();
    if (valor.clave !== valor.confirmacion) {
      this.formConfiguracion.controls.confirmacion.setErrors({ noCoincide: true });
    }
    if (this.formConfiguracion.invalid) {
      this.formConfiguracion.markAllAsTouched();
      return;
    }
    await this.#enviar(async () => {
      await this.#sesion.configurar(
        {
          nombreUsuario: valor.nombreUsuario.trim(),
          nombreCompleto: valor.nombreCompleto.trim(),
          correo: valor.correo.trim() || null,
          clave: valor.clave,
        },
        valor.claveAdministracion,
      );
    });
  }

  async #enviar(accion: () => Promise<void>, alFallar?: () => void): Promise<void> {
    this.enviando.set(true);
    this.error.set(null);
    try {
      await accion();
      await this.#irAlDestino();
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formConfiguracion, error)) {
        this.error.set(mensajeDeError(error));
      }
      alFallar?.();
    } finally {
      this.enviando.set(false);
    }
  }

  /** Solo se vuelve a rutas internas del panel: nunca a otra página ni a otro sitio. */
  #irAlDestino(): Promise<boolean> {
    const destino = this.volver();
    const seguro = destino?.startsWith('/admin') && !destino.startsWith('/admin/login') ? destino : '/admin';
    return this.#router.navigateByUrl(seguro, { replaceUrl: true });
  }
}

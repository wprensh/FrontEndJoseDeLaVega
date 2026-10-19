import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  ACCIONES,
  Accion,
  InfoModulo,
  MODULOS,
  PATRON_CLAVE,
  PATRON_NOMBRE_USUARIO,
  Permiso,
  Usuario,
} from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';

export interface UsuarioDialogData {
  /** Usuario a editar; sin él, el diálogo crea uno nuevo. */
  readonly usuario?: Usuario;
  /** Id del usuario de la sesión: no puede desactivarse a sí mismo. */
  readonly idSesion: string | null;
}

/** Crear o editar un usuario, con la matriz de permisos por módulo (Ver, Crear, Editar, Eliminar). */
@Component({
  selector: 'app-usuario-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './usuario-dialog.component.html',
  styleUrl: './usuario-dialog.component.scss',
})
export class UsuarioDialogComponent {
  readonly #servicio = inject(UsuariosService);
  readonly #ref = inject(MatDialogRef<UsuarioDialogComponent, Usuario>);
  protected readonly data = inject<UsuarioDialogData>(MAT_DIALOG_DATA);

  protected readonly modulos = MODULOS;
  protected readonly acciones = ACCIONES;
  protected readonly editando = this.data.usuario ?? null;
  protected readonly esUnoMismo = this.editando !== null && this.editando.id === this.data.idSesion;
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly permisos = signal(new Set<Permiso>(this.editando?.permisos ?? []));

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    nombreCompleto: [this.editando?.nombreCompleto ?? '', [Validators.required, Validators.maxLength(120)]],
    correo: [this.editando?.correo ?? '', [Validators.email, Validators.maxLength(150)]],
    nombreUsuario: [
      { value: this.editando?.nombreUsuario ?? '', disabled: this.editando !== null },
      [Validators.required, Validators.pattern(PATRON_NOMBRE_USUARIO)],
    ],
    clave: [
      { value: '', disabled: this.editando !== null },
      [Validators.required, Validators.pattern(PATRON_CLAVE)],
    ],
    confirmacion: [{ value: '', disabled: this.editando !== null }, Validators.required],
    esSuperAdministrador: [this.editando?.esSuperAdministrador ?? false],
    activo: [{ value: this.editando?.activo ?? true, disabled: this.esUnoMismo }],
  });

  protected readonly esSuper = toSignal(this.formulario.controls.esSuperAdministrador.valueChanges, {
    initialValue: this.formulario.controls.esSuperAdministrador.value,
  });

  protected readonly sinPermisos = computed(() => !this.esSuper() && this.permisos().size === 0);

  protected tiene(modulo: InfoModulo, accion: Accion): boolean {
    return this.esSuper() || this.permisos().has(`${modulo.modulo}:${accion}`);
  }

  protected todas(modulo: InfoModulo): boolean {
    return this.acciones.every((a) => this.tiene(modulo, a));
  }

  protected algunas(modulo: InfoModulo): boolean {
    return !this.todas(modulo) && this.acciones.some((a) => this.tiene(modulo, a));
  }

  /** Crear, editar o eliminar marcan también "Ver"; quitar "Ver" quita todo el módulo. */
  protected alternar(modulo: InfoModulo, accion: Accion, marcado: boolean): void {
    this.permisos.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) {
        nuevo.add(`${modulo.modulo}:${accion}`);
        nuevo.add(`${modulo.modulo}:Ver`);
      } else if (accion === 'Ver') {
        this.acciones.forEach((a) => nuevo.delete(`${modulo.modulo}:${a}`));
      } else {
        nuevo.delete(`${modulo.modulo}:${accion}`);
      }
      return nuevo;
    });
  }

  protected alternarModulo(modulo: InfoModulo, marcado: boolean): void {
    this.permisos.update((actual) => {
      const nuevo = new Set(actual);
      this.acciones.forEach((a) => (marcado ? nuevo.add(`${modulo.modulo}:${a}`) : nuevo.delete(`${modulo.modulo}:${a}`)));
      return nuevo;
    });
  }

  protected async guardar(): Promise<void> {
    const valor = this.formulario.getRawValue();
    if (!this.editando && valor.clave !== valor.confirmacion) {
      this.formulario.controls.confirmacion.setErrors({ noCoincide: true });
    }
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const permisos = valor.esSuperAdministrador ? [] : [...this.permisos()];
    this.guardando.set(true);
    this.error.set(null);
    try {
      const guardado = this.editando
        ? await this.#servicio.actualizar(this.editando.id, {
            nombreCompleto: valor.nombreCompleto.trim(),
            correo: valor.correo.trim() || null,
            esSuperAdministrador: valor.esSuperAdministrador,
            activo: valor.activo,
            permisos,
          })
        : await this.#servicio.crear({
            nombreUsuario: valor.nombreUsuario.trim(),
            nombreCompleto: valor.nombreCompleto.trim(),
            correo: valor.correo.trim() || null,
            clave: valor.clave,
            esSuperAdministrador: valor.esSuperAdministrador,
            permisos,
          });
      this.#ref.close(guardado);
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.guardando.set(false);
    }
  }
}

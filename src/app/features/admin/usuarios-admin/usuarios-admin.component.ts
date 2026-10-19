import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { ACCIONES, MODULOS, Usuario } from '../../../core/models/usuario.model';
import { paginadorEnEspanol } from '../../../core/paginador-intl';
import { SesionService } from '../../../core/services/sesion.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { RestablecerClaveDialogComponent } from './restablecer-clave-dialog.component';
import { UsuarioDialogComponent, UsuarioDialogData } from './usuario-dialog.component';

/** Módulo de usuarios: quién entra al panel y qué puede hacer en cada módulo. */
@Component({
  selector: 'app-usuarios-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    MatTooltipModule,
    BarraAdminComponent,
    PageHeadingComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './usuarios-admin.component.html',
  styleUrl: './usuarios-admin.component.scss',
})
export class UsuariosAdminComponent implements OnInit {
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly servicio = inject(UsuariosService);
  protected readonly sesion = inject(SesionService);

  protected readonly columnas = ['usuario', 'permisos', 'estado', 'ultimoAcceso', 'acciones'] as const;
  protected readonly porId = (_: number, usuario: Usuario): string => usuario.id;

  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(20);

  ngOnInit(): void {
    void this.recargar();
  }

  protected recargar(): Promise<void> {
    return this.servicio.cargar({
      buscar: this.busqueda().trim() || undefined,
      pagina: this.pagina(),
      tamanoPagina: this.tamanoPagina(),
    });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex + 1);
    this.tamanoPagina.set(evento.pageSize);
    void this.recargar();
  }

  /** "Noticias: Ver, Editar" por cada módulo con algún permiso. */
  protected resumenPermisos(usuario: Usuario): { modulo: string; acciones: string }[] {
    return MODULOS.map((info) => ({
      modulo: info.etiqueta,
      acciones: ACCIONES.filter((a) => usuario.permisos.includes(`${info.modulo}:${a}`))
        .map((a) => info.acciones[a])
        .join(', '),
    })).filter((r) => r.acciones);
  }

  protected async nuevo(): Promise<void> {
    const creado = await this.#abrirFormulario({ idSesion: this.sesion.usuario()?.id ?? null });
    if (creado) {
      this.#snackBar.open(`Usuario ${creado.nombreUsuario} creado.`, 'Cerrar');
      await this.recargar();
    }
  }

  protected async editar(usuario: Usuario): Promise<void> {
    const actualizado = await this.#abrirFormulario({ usuario, idSesion: this.sesion.usuario()?.id ?? null });
    if (actualizado) {
      this.#snackBar.open('Usuario actualizado.', 'Cerrar');
      // Si se cambió a sí mismo (nombre o permisos), la barra y los botones lo reflejan de una vez.
      if (actualizado.id === this.sesion.usuario()?.id) {
        await this.sesion.actualizarPerfil();
      }
    }
  }

  protected async restablecerClave(usuario: Usuario): Promise<void> {
    const listo = await firstValueFrom(
      this.#dialog
        .open<RestablecerClaveDialogComponent, Usuario, boolean>(RestablecerClaveDialogComponent, {
          data: usuario,
          width: '440px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (listo) {
      this.#snackBar.open(`Contraseña de ${usuario.nombreUsuario} restablecida.`, 'Cerrar');
      await this.recargar();
    }
  }

  protected async eliminar(usuario: Usuario): Promise<void> {
    const confirmado = await firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            titulo: 'Eliminar usuario',
            mensaje: `¿Desea eliminar a ${usuario.nombreCompleto} (${usuario.nombreUsuario})? Ya no podrá iniciar sesión. Si solo quiere quitarle el acceso por un tiempo, desactívelo.`,
            confirmar: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (!confirmado) {
      return;
    }

    try {
      await this.servicio.eliminar(usuario.id);
      this.#snackBar.open('Usuario eliminado.', 'Cerrar');
      if (this.servicio.usuarios().length === 0 && this.pagina() > 1) {
        this.pagina.update((p) => p - 1);
        await this.recargar();
      }
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  #abrirFormulario(data: UsuarioDialogData): Promise<Usuario | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<UsuarioDialogComponent, UsuarioDialogData, Usuario>(UsuarioDialogComponent, {
          data,
          width: '760px',
          maxWidth: '95vw',
          autoFocus: 'first-tabbable',
        })
        .afterClosed(),
    );
  }
}

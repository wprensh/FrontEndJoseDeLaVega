import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import {
  ClaveGenerada,
  FiltroClaves,
  GRADOS,
  MiembroCampus,
  RolCampus,
  cursoDe,
  nombreGrado,
} from '../../../core/models/campus.model';
import { paginadorEnEspanol } from '../../../core/paginador-intl';
import { ComunidadService } from '../../../core/services/comunidad.service';
import { SesionService } from '../../../core/services/sesion.service';
import { mensajeDeError } from '../../../core/utils/http-error';
import { BarraAdminComponent } from '../../../shared/barra-admin/barra-admin.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { GenerarClavesDialogComponent } from './generar-claves-dialog.component';
import { ImportarDialogComponent } from './importar-dialog.component';
import { MiembroDialogComponent } from './miembro-dialog.component';

/** Clase del <body> que deja visibles solo las claves al imprimir (ver styles.scss). */
const CLASE_IMPRESION = 'imprimiendo-claves';

/**
 * Estudiantes y docentes del campus virtual: registro, importación de listas y claves de acceso.
 * Las claves solo llegan al generarlas, así que se muestran en tarjetas listas para imprimir y recortar.
 */
@Component({
  selector: 'app-comunidad-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    BarraAdminComponent,
    PageHeadingComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './comunidad-admin.component.html',
  styleUrl: './comunidad-admin.component.scss',
})
export class ComunidadAdminComponent implements OnInit {
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  protected readonly servicio = inject(ComunidadService);
  protected readonly sesion = inject(SesionService);

  protected readonly columnas = ['persona', 'curso', 'acceso', 'ultimoAcceso', 'acciones'] as const;
  protected readonly porId = (_: number, m: MiembroCampus): string => m.id;
  protected readonly grados = GRADOS;
  protected readonly nombreGrado = nombreGrado;
  protected readonly cursoDe = cursoDe;
  protected readonly urlCampus = new URL('campus', document.baseURI).href;

  protected readonly busqueda = signal('');
  protected readonly rol = signal<RolCampus | null>(null);
  protected readonly grado = signal<number | null>(null);
  protected readonly grupo = signal('');
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(25);

  /** Claves recién generadas, para imprimir. Se descartan al cerrar la hoja. */
  protected readonly claves = signal<ClaveGenerada[] | null>(null);
  protected readonly generando = signal(false);

  ngOnInit(): void {
    void this.recargar();
  }

  protected recargar(): Promise<void> {
    return this.servicio.cargar({
      buscar: this.busqueda().trim() || undefined,
      rol: this.rol() ?? undefined,
      grado: this.grado() ?? undefined,
      grupo: this.grupo().trim() || undefined,
      pagina: this.pagina(),
      tamanoPagina: this.tamanoPagina(),
    });
  }

  protected filtrar(): void {
    this.pagina.set(1);
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex + 1);
    this.tamanoPagina.set(evento.pageSize);
    void this.recargar();
  }

  protected async nuevo(): Promise<void> {
    const creado = await this.#abrir(null);
    if (creado) {
      this.#snackBar.open(`${creado.nombreCompleto} registrado. Genérele la clave de acceso.`, 'Cerrar');
      await this.recargar();
    }
  }

  protected async editar(miembro: MiembroCampus): Promise<void> {
    if (await this.#abrir(miembro)) {
      this.#snackBar.open('Datos actualizados.', 'Cerrar');
    }
  }

  protected async importar(): Promise<void> {
    const importado = await firstValueFrom(
      this.#dialog.open(ImportarDialogComponent, { width: '720px', maxWidth: '95vw' }).afterClosed(),
    );
    if (importado) {
      await this.recargar();
    }
  }

  protected async generarClaves(): Promise<void> {
    const filtro = await firstValueFrom(
      this.#dialog
        .open<GenerarClavesDialogComponent, void, FiltroClaves>(GenerarClavesDialogComponent, {
          width: '560px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (filtro) {
      await this.#generar(filtro);
    }
  }

  protected async claveDe(miembro: MiembroCampus): Promise<void> {
    if (miembro.tieneClave) {
      const confirmado = await this.#confirmar(
        'Generar clave nueva',
        `${miembro.nombreCompleto} recibirá una clave nueva y la anterior dejará de servir.`,
        'Generar',
      );
      if (!confirmado) {
        return;
      }
    }
    await this.#generar({ ids: [miembro.id] });
  }

  protected async eliminar(miembro: MiembroCampus): Promise<void> {
    const confirmado = await this.#confirmar(
      'Eliminar',
      `¿Desea eliminar a ${miembro.nombreCompleto}? Si ya votó o fue candidato, desactívelo en lugar de eliminarlo.`,
      'Eliminar',
    );
    if (!confirmado) {
      return;
    }
    try {
      await this.servicio.eliminar(miembro.id);
      this.#snackBar.open('Eliminado.', 'Cerrar');
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  /** Imprime solo las tarjetas con las claves (el navegador también permite guardarlas como PDF). */
  protected imprimir(): void {
    document.body.classList.add(CLASE_IMPRESION);
    window.addEventListener('afterprint', () => document.body.classList.remove(CLASE_IMPRESION), { once: true });
    window.print();
  }

  protected cerrarClaves(): void {
    this.claves.set(null);
  }

  async #generar(filtro: FiltroClaves): Promise<void> {
    this.generando.set(true);
    try {
      const claves = await this.servicio.generarClaves(filtro);
      this.claves.set(claves);
      this.#snackBar.open(
        `${claves.length} ${claves.length === 1 ? 'clave generada' : 'claves generadas'}. Imprímalas ahora: no se vuelven a mostrar.`,
        'Cerrar',
        { duration: 8000 },
      );
      await this.recargar();
      queueMicrotask(() => document.getElementById('hoja-claves')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.generando.set(false);
    }
  }

  #abrir(miembro: MiembroCampus | null): Promise<MiembroCampus | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<MiembroDialogComponent, MiembroCampus | null, MiembroCampus>(MiembroDialogComponent, {
          data: miembro,
          width: '520px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
  }

  #confirmar(titulo: string, mensaje: string, confirmar: string): Promise<boolean | undefined> {
    return firstValueFrom(
      this.#dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { titulo, mensaje, confirmar },
        })
        .afterClosed(),
    );
  }
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { EnlaceNavegacion, INSTITUCION, NAVEGACION } from '../../core/institucion';
import { EscudoComponent } from '../../shared/escudo/escudo.component';

/** Encabezado institucional: barra superior, escudo, nombre, ciudad y navegación principal. */
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, EscudoComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  protected readonly institucion = INSTITUCION;
  protected readonly navegacion = NAVEGACION;

  /** Accesos rápidos de la barra superior (propuesta 1a). */
  protected readonly accesos: readonly EnlaceNavegacion[] = [
    { ruta: '/contacto', etiqueta: 'PQRS' },
    { ruta: '/admisiones', etiqueta: 'Inscripción de cupos' },
    { ruta: '/campus', etiqueta: 'Campus virtual' },
  ];

  /** Menú desplegable en pantallas pequeñas. */
  protected readonly menuAbierto = signal(false);

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}

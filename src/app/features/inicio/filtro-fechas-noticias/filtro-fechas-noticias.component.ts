import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ArchivoMes, OrdenNoticias } from '../../../core/models/noticia.model';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import {
  ATAJOS_PERIODO,
  FiltroFechasNoticias,
  PeriodoNoticias,
  claveMes,
  esMesDeArchivo,
} from '../../../core/utils/periodo-noticias';

interface OpcionMes {
  readonly clave: `${number}-${number}`;
  readonly fecha: Date;
  readonly total: number;
}

/**
 * Barra de filtro por fechas de "Noticias recientes":
 * atajos de periodo, rango personalizado con calendario, archivo por meses y orden.
 * Es un componente de presentación: recibe el filtro actual y emite el nuevo en `cambiar`.
 */
@Component({
  selector: 'app-filtro-fechas-noticias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './filtro-fechas-noticias.component.html',
  styleUrl: './filtro-fechas-noticias.component.scss',
})
export class FiltroFechasNoticiasComponent {
  readonly filtro = input.required<FiltroFechasNoticias>();
  readonly archivo = input<readonly ArchivoMes[]>([]);
  readonly cambiar = output<FiltroFechasNoticias>();

  protected readonly atajos = ATAJOS_PERIODO;

  /** Atajo resaltado; ninguno cuando se eligió un mes del archivo. */
  protected readonly atajoActivo = computed(() => {
    const periodo = this.filtro().periodo;
    return esMesDeArchivo(periodo) ? null : periodo;
  });

  protected readonly mesActivo = computed(() => {
    const periodo = this.filtro().periodo;
    return esMesDeArchivo(periodo) ? periodo : null;
  });

  protected readonly meses = computed<readonly OpcionMes[]>(() =>
    this.archivo().map((m) => ({ clave: claveMes(m.anio, m.mes), fecha: new Date(m.anio, m.mes - 1, 1), total: m.total })),
  );

  /** El calendario empieza en el primer mes con noticias; no hay límite final (eventos futuros). */
  protected readonly fechaMinima = computed(() => this.meses().at(-1)?.fecha ?? null);

  protected readonly rango = new FormGroup({
    desde: new FormControl<Date | null>(null),
    hasta: new FormControl<Date | null>(null),
  });

  constructor() {
    // El formulario del rango refleja el filtro recibido (p. ej. al abrir un enlace con ?periodo=personalizado).
    effect(() => {
      const { desde, hasta } = this.filtro();
      this.rango.setValue(
        { desde: desde ? desdeFechaIso(desde) : null, hasta: hasta ? desdeFechaIso(hasta) : null },
        { emitEvent: false },
      );
    });
  }

  protected elegirAtajo(evento: MatChipListboxChange): void {
    // Al pulsar de nuevo el chip activo, el listbox lo deselecciona: se vuelve a "Todas".
    const periodo = (evento.value as PeriodoNoticias | undefined) ?? 'todas';
    this.emitir({ periodo, desde: null, hasta: null });
  }

  protected elegirMes(clave: `${number}-${number}` | null): void {
    this.emitir({ periodo: clave ?? 'todas', desde: null, hasta: null });
  }

  protected elegirOrden(orden: OrdenNoticias): void {
    this.emitir({ orden });
  }

  /** Se aplica cuando el rango está completo; mientras se elige la fecha final no se consulta la API. */
  protected aplicarRango(): void {
    const { desde, hasta } = this.rango.getRawValue();
    if (desde && hasta) {
      this.emitir({ periodo: 'personalizado', desde: aFechaIso(desde), hasta: aFechaIso(hasta) });
    }
  }

  private emitir(cambios: Partial<FiltroFechasNoticias>): void {
    this.cambiar.emit({ ...this.filtro(), ...cambios });
  }
}

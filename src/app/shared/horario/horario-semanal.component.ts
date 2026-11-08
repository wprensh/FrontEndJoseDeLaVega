import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import interactionPlugin, { DropArg, Draggable, EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

import { BloqueHorario, colorDe, diaYHora, fechaDelDia, horaLegible, nombreCurso } from '../../core/models/horario.model';

/** Cambio pedido desde el calendario: día (1–6) y franja "HH:mm". */
export interface FranjaHorario {
  readonly dia: number;
  readonly inicio: string;
  readonly fin: string;
}

export interface SoltarClase extends FranjaHorario {
  readonly asignacionId: string;
}

export interface MoverClase extends FranjaHorario {
  readonly bloqueId: string;
  /** Devuelve el bloque a su lugar si el servidor rechaza el cambio. */
  readonly deshacer: () => void;
}

/**
 * Horario semanal de lunes a sábado con FullCalendar (edición estándar, licencia MIT).
 * Con `editable` las clases se arrastran, se alargan y se sueltan desde una lista externa (`origenArrastre`):
 * cada elemento con la clase `clase-pendiente` y el atributo `data-asignacion` se puede soltar en el calendario.
 */
@Component({
  selector: 'app-horario-semanal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullCalendarModule],
  template: `<full-calendar [options]="opciones()" />`,
  styles: `
    :host {
      display: block;
      --fc-border-color: var(--jv-borde);
      --fc-today-bg-color: transparent;
      --fc-now-indicator-color: var(--jv-rojo);
      --fc-event-border-color: transparent;
    }

    :host ::ng-deep {
      .fc {
        font-size: 0.9rem;
      }

      .fc-col-header-cell-cushion {
        color: var(--jv-azul);
        font: 700 0.85rem / 1.2 var(--jv-fuente-titulos);
        text-transform: capitalize;
        padding-block: 0.5rem;
      }

      .fc-timegrid-slot-label-cushion {
        color: var(--jv-texto-suave);
        font-size: 0.78rem;
      }

      .fc-timegrid-slot {
        block-size: 1.6rem;
      }

      .fc-event {
        border-radius: 6px;
        cursor: default;
      }

      .fc-event.fc-event-draggable {
        cursor: grab;
      }

      .clase {
        display: grid;
        gap: 1px;
        padding: 2px 4px;
        line-height: 1.2;
        overflow: hidden;

        strong {
          font-size: 0.85rem;
        }

        span {
          font-size: 0.75rem;
          opacity: 0.92;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  `,
})
export class HorarioSemanalComponent {
  readonly bloques = input.required<readonly BloqueHorario[]>();
  /** Qué se ve en cada clase: el curso (horario de un docente) o el docente (horario de un curso). */
  readonly vista = input<'docente' | 'curso'>('docente');
  readonly editable = input(false);
  readonly puedeEliminar = input(false);
  readonly origenArrastre = input<HTMLElement | null>(null);
  /** Minutos de una clase nueva al soltarla. */
  readonly duracionMinutos = input(60);
  readonly primeraHora = input('06:00');
  readonly ultimaHora = input('18:00');

  private readonly calendario = viewChild(FullCalendarComponent);
  readonly #anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly soltar = output<SoltarClase>();
  readonly mover = output<MoverClase>();
  readonly eliminar = output<BloqueHorario>();

  protected readonly opciones = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    locale: esLocale,
    initialView: 'timeGridWeek',
    initialDate: '2024-01-01',
    headerToolbar: false,
    hiddenDays: [0],
    allDaySlot: false,
    dayHeaderFormat: { weekday: 'long' },
    slotMinTime: this.primeraHora(),
    slotMaxTime: this.ultimaHora(),
    slotDuration: '00:30:00',
    snapDuration: '00:05:00',
    slotLabelFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
    expandRows: true,
    height: 'auto',
    nowIndicator: false,
    editable: this.editable(),
    droppable: this.editable(),
    eventDurationEditable: this.editable(),
    eventOverlap: false,
    events: this.eventos(),
    eventContent: (arg) => {
      const b = arg.event.extendedProps['bloque'] as BloqueHorario | undefined;
      if (!b) {
        // Vista previa mientras se arrastra una clase desde la lista.
        return { html: `<div class="clase"><strong></strong><span>${arg.timeText}</span></div>` };
      }
      const principal = this.vista() === 'docente' ? nombreCurso(b.grado, b.grupo) : b.asignatura;
      const secundario = this.vista() === 'docente' ? b.asignatura : b.docenteNombre;
      const nodo = document.createElement('div');
      nodo.className = 'clase';
      const lineas: [string, string][] = [
        ['strong', principal],
        ['span', `${horaLegible(b.inicio)} – ${horaLegible(b.fin)}`],
        ['span', secundario],
      ];
      for (const [etiqueta, texto] of lineas) {
        const el = document.createElement(etiqueta);
        el.textContent = texto;
        nodo.append(el);
      }
      return { domNodes: [nodo] };
    },
    eventDidMount: (arg) => {
      const b = arg.event.extendedProps['bloque'] as BloqueHorario | undefined;
      if (!b) {
        return;
      }
      arg.el.title = `${b.asignatura} · ${nombreCurso(b.grado, b.grupo)} · ${b.docenteNombre}` +
        (this.puedeEliminar() ? '\nClic para quitarla del horario' : '');
    },
    drop: (arg: DropArg) => this.#alSoltar(arg),
    eventDrop: (arg: EventDropArg) => this.#alMover(arg.event.id, arg.event.start, arg.event.end, arg.revert),
    eventResize: (arg: EventResizeDoneArg) => this.#alMover(arg.event.id, arg.event.start, arg.event.end, arg.revert),
    eventClick: (arg: EventClickArg) => {
      if (this.puedeEliminar()) {
        this.eliminar.emit(arg.event.extendedProps['bloque'] as BloqueHorario);
      }
    },
  }));

  protected readonly eventos = computed<EventInput[]>(() =>
    this.bloques().map((b) => {
      const color = colorDe(this.vista() === 'docente' ? nombreCurso(b.grado, b.grupo) : b.asignatura);
      return {
        id: b.id,
        start: fechaDelDia(b.dia, b.inicio),
        end: fechaDelDia(b.dia, b.fin),
        backgroundColor: color,
        textColor: '#ffffff',
        extendedProps: { bloque: b },
      };
    }),
  );

  constructor() {
    // El ancho cambia al plegar el menú lateral o al cambiar la lista de clases, no solo al cambiar la ventana.
    effect((onCleanup) => {
      const calendario = this.calendario();
      if (!calendario || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observador = new ResizeObserver(() => calendario.getApi().updateSize());
      observador.observe(this.#anfitrion.nativeElement);
      onCleanup(() => observador.disconnect());
    });

    // Conecta la lista de clases por ubicar como origen de arrastre mientras el calendario sea editable.
    effect((onCleanup) => {
      const origen = this.origenArrastre();
      if (!origen || !this.editable()) {
        return;
      }
      const arrastre = new Draggable(origen, {
        itemSelector: '.clase-pendiente',
        eventData: (el) => ({
          title: el.dataset['titulo'] ?? '',
          duration: { minutes: this.duracionMinutos() },
          create: false,
        }),
      });
      onCleanup(() => arrastre.destroy());
    });
  }

  #alSoltar(arg: DropArg): void {
    const asignacionId = arg.draggedEl.dataset['asignacion'];
    if (!asignacionId) {
      return;
    }
    const inicio = arg.date;
    const fin = new Date(inicio.getTime() + this.duracionMinutos() * 60_000);
    const a = diaYHora(inicio);
    this.soltar.emit({ asignacionId, dia: a.dia, inicio: a.hora, fin: diaYHora(fin).hora });
  }

  #alMover(bloqueId: string, inicio: Date | null, fin: Date | null, deshacer: () => void): void {
    if (!inicio || !fin) {
      deshacer();
      return;
    }
    const a = diaYHora(inicio);
    const b = diaYHora(fin);
    if (a.dia !== b.dia) {
      deshacer();
      return;
    }
    this.mover.emit({ bloqueId, dia: a.dia, inicio: a.hora, fin: b.hora, deshacer });
  }
}

import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import interactionPlugin, { DropArg, Draggable, EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

import {
  BloqueHorario,
  JORNADA_BACHILLERATO,
  Jornada,
  colorDe,
  diaYHora,
  fechaDelDia,
  franjaEnJornada,
  horaLegible,
  horasCubiertas,
  nombreCurso,
  rangoVisible,
} from '../../core/models/horario.model';

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
        block-size: 0.95rem;
      }

      .fc-timegrid-slot-minor {
        border-block-start-style: none;
      }

      .fc-timegrid-slot-label-cushion {
        line-height: 1.15;
        text-align: end;
      }

      .franja-descanso {
        background: repeating-linear-gradient(135deg, #e9ecf2 0 6px, #f3f5f9 6px 12px);
        opacity: 1;
      }

      .descanso {
        display: block;
        padding: 1px 4px;
        color: var(--jv-texto-suave);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
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
  /** Horas de clase y descansos: el calendario muestra esas franjas y ajusta cada clase a ellas. */
  readonly jornada = input<Jornada>(JORNADA_BACHILLERATO);
  /** Horas de clase seguidas que ocupa una clase nueva al soltarla (1 o 2). */
  readonly horasPorClase = input(1);

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
    slotMinTime: this.rango().desde,
    slotMaxTime: this.rango().hasta,
    slotDuration: '00:10:00',
    slotLabelInterval: '00:10:00',
    snapDuration: '00:10:00',
    slotLabelContent: (arg) => {
      const hora = diaYHora(arg.date).hora;
      const franja = this.jornada().franjas.find((f) => f.inicio === hora && !f.descanso);
      return franja ? { html: `<b>${franja.etiqueta}</b><br>${horaLegible(hora)}` } : '';
    },
    expandRows: true,
    height: 'auto',
    nowIndicator: false,
    editable: this.editable(),
    droppable: this.editable(),
    eventDurationEditable: this.editable(),
    // Una clase no puede quedar encima de otra; sí puede tocar un descanso mientras se arrastra,
    // porque al soltarla se ajusta a la hora de clase que corresponde.
    eventOverlap: (quieto) => quieto.display === 'background',
    events: [...this.descansos(), ...this.eventos()],
    eventContent: (arg) => {
      if (arg.event.display === 'background') {
        return { html: `<span class="descanso">${arg.event.title}</span>` };
      }
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
        ['span', `${horaLegible(b.inicio).split(' ')[0]} – ${horaLegible(b.fin).split(' ')[0]}`],
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
    eventDrop: (arg: EventDropArg) => {
      // Al mover, la clase conserva cuántas horas de clase ocupaba.
      const b = arg.oldEvent.extendedProps['bloque'] as BloqueHorario;
      this.#alMover(arg.event.id, arg.event.start, horasCubiertas(this.jornada(), b.inicio, b.fin), arg.revert);
    },
    eventResize: (arg: EventResizeDoneArg) => {
      const inicio = arg.event.start;
      const fin = arg.event.end;
      const horas = inicio && fin ? horasCubiertas(this.jornada(), diaYHora(inicio).hora, diaYHora(fin).hora) : 1;
      this.#alMover(arg.event.id, inicio, horas, arg.revert);
    },
    eventClick: (arg: EventClickArg) => {
      if (this.puedeEliminar()) {
        this.eliminar.emit(arg.event.extendedProps['bloque'] as BloqueHorario);
      }
    },
  }));

  protected readonly rango = computed(() => rangoVisible(this.jornada(), this.bloques()));

  /** Descansos como franjas grises: no se puede ubicar una clase encima. */
  protected readonly descansos = computed<EventInput[]>(() =>
    this.jornada()
      .franjas.filter((f) => f.descanso)
      .map((f) => ({
        title: f.etiqueta,
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        startTime: f.inicio,
        endTime: f.fin,
        display: 'background',
        overlap: true,
        classNames: ['franja-descanso'],
      })),
  );

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
          duration: { minutes: 50 * this.horasPorClase() },
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
    const { dia, hora } = diaYHora(arg.date);
    const franja = this.#ajustar(hora, this.horasPorClase());
    this.soltar.emit({ asignacionId, dia, ...franja });
  }

  #alMover(bloqueId: string, inicio: Date | null, horas: number, deshacer: () => void): void {
    if (!inicio) {
      deshacer();
      return;
    }
    const { dia, hora } = diaYHora(inicio);
    this.mover.emit({ bloqueId, dia, ...this.#ajustar(hora, horas), deshacer });
  }

  /** Lleva la franja a las horas de clase de la jornada; por fuera de ella usa horas de 50 minutos. */
  #ajustar(hora: string, horas: number): { inicio: string; fin: string } {
    const enJornada = franjaEnJornada(this.jornada(), hora, horas);
    if (enJornada) {
      return enJornada;
    }
    const [h, m] = hora.split(':').map(Number);
    const fin = h * 60 + m + 50 * horas;
    return { inicio: hora, fin: `${String(Math.floor(fin / 60) % 24).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}` };
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { Curso, formatoNota } from '../../../core/models/academico.model';
import { enlaceWhatsApp, nombreGrado } from '../../../core/models/campus.model';
import { AlertaEstudiante, Alertas, NIVELES_RIESGO, NivelRiesgo } from '../../../core/models/mejoras.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { PanelMejorasService } from '../../../core/services/mejoras.service';
import { descargarCsv } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

const TONO: Readonly<Record<NivelRiesgo, string>> = { Alto: 'peligro', Medio: 'alerta', Bajo: '' };

/**
 * Alerta temprana de deserción y de pérdida del año: cruza fallas, notas perdidas, convivencia y simulacros
 * para que orientación y coordinación actúen antes de que sea tarde.
 */
@Component({
  selector: 'app-alertas-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        titulo="Alerta temprana"
        subtitulo="Estudiantes en riesgo de desertar o de perder el año, con los motivos y el contacto del acudiente"
        etiqueta="Panel administrativo"
      />

      <div class="barra-filtros no-imprimir">
        <mat-form-field>
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="curso" (ngModelChange)="cargar()">
            <mat-option [value]="null">Toda la institución</mat-option>
            @for (c of cursos(); track $index) {
              <mat-option [value]="c">{{ grado(c.grado) }} {{ c.grupo ?? '' }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-button-toggle-group aria-label="Nivel de riesgo" [value]="nivel()" (change)="nivel.set($event.value)">
          <mat-button-toggle value="todos">Todos</mat-button-toggle>
          <mat-button-toggle value="Alto">Alto</mat-button-toggle>
          <mat-button-toggle value="Medio">Medio</mat-button-toggle>
          <mat-button-toggle value="Bajo">Bajo</mat-button-toggle>
        </mat-button-toggle-group>
        <span class="espacio"></span>
        <button mat-stroked-button type="button" [disabled]="!visibles().length" (click)="exportar()">
          <mat-icon aria-hidden="true">download</mat-icon> CSV
        </button>
        <button mat-stroked-button type="button" (click)="imprimir()"><mat-icon aria-hidden="true">print</mat-icon> Imprimir</button>
      </div>

      @if (error(); as e) {
        <p class="aviso-error" role="alert">{{ e }}</p>
      }
      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" aria-label="Calculando alertas" />
      }

      @if (alertas(); as a) {
        <ul class="cifras">
          <li class="tarjeta"><strong>{{ a.evaluados }}</strong><span>estudiantes evaluados</span></li>
          <li class="tarjeta alto"><strong>{{ a.altos }}</strong><span>riesgo alto</span></li>
          <li class="tarjeta medio"><strong>{{ a.medios }}</strong><span>riesgo medio</span></li>
          <li class="tarjeta"><strong>{{ a.bajos }}</strong><span>riesgo bajo</span></li>
        </ul>
        <p class="texto-suave">
          Corte al {{ a.fecha | date: "d 'de' MMMM 'de' y" }}@if (a.periodo) { · {{ a.periodo }}}. Puntaje de 0 a 100: fallas de los
          últimos 30 días y del año, asignaturas perdidas, promedio, situaciones de convivencia abiertas y simulacros Saber.
        </p>

        <div class="tarjeta tabla-desplazable">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Riesgo</th>
                <th scope="col">Motivos</th>
                <th scope="col" class="numero">Fallas 30 d / año</th>
                <th scope="col" class="numero">Promedio</th>
                <th scope="col" class="no-imprimir">Acudiente</th>
              </tr>
            </thead>
            <tbody>
              @for (e of visibles(); track e.estudianteId) {
                <tr>
                  <td>
                    <strong>{{ e.nombreCompleto }}</strong><br />
                    <small class="texto-suave">{{ grado(e.grado) }} {{ e.grupo ?? '' }} · {{ e.documento }}</small>
                  </td>
                  <td><span class="etiqueta-estado" [attr.data-tono]="tono[e.nivel]">{{ niveles[e.nivel] }} · {{ e.puntaje }}</span></td>
                  <td>
                    <ul class="motivos">
                      @for (m of e.motivos; track $index) {
                        <li>{{ m }}</li>
                      }
                    </ul>
                  </td>
                  <td class="numero">{{ e.ausencias30Dias }} / {{ e.ausenciasAnio }}</td>
                  <td class="numero">{{ nota(e.promedio) }}</td>
                  <td class="no-imprimir">
                    @if (e.acudiente) {
                      {{ e.acudiente }}
                      @if (whatsapp(e); as enlace) {
                        <br /><a [href]="enlace" target="_blank" rel="noopener">WhatsApp {{ e.telefonoAcudiente }}</a>
                      } @else if (e.telefonoAcudiente) {
                        <br />{{ e.telefonoAcudiente }}
                      }
                    } @else {
                      <span class="texto-suave">Sin acudiente registrado</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="texto-suave">Ningún estudiante con ese nivel de riesgo.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .espacio {
      flex: 1;
    }

    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        text-align: center;
      }

      strong {
        color: var(--jv-azul);
        font-family: var(--jv-fuente-titulos);
        font-size: 1.9rem;
      }

      .alto strong {
        color: var(--jv-rojo);
      }

      .medio strong {
        color: var(--jv-naranja);
      }
    }

    .motivos {
      margin: 0;
      padding-inline-start: 1rem;
      font-size: 0.88rem;
    }
  `,
})
export class AlertasAdminComponent implements OnInit {
  readonly #servicio = inject(PanelMejorasService);
  readonly #academico = inject(AcademicoAdminService);

  protected readonly cursos = signal<Curso[]>([]);
  protected readonly alertas = signal<Alertas | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly nivel = signal<NivelRiesgo | 'todos'>('todos');
  protected readonly niveles = NIVELES_RIESGO;
  protected readonly tono = TONO;
  protected readonly grado = nombreGrado;
  protected readonly nota = formatoNota;
  protected curso: Curso | null = null;

  protected readonly visibles = computed(() => {
    const items = this.alertas()?.items ?? [];
    const nivel = this.nivel();
    return nivel === 'todos' ? items : items.filter((e) => e.nivel === nivel);
  });

  async ngOnInit(): Promise<void> {
    this.#academico
      .cursos()
      .then((c) => this.cursos.set(c))
      .catch(() => undefined);
    await this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.alertas.set(await this.#servicio.alertas({ grado: this.curso?.grado, grupo: this.curso?.grupo }));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected whatsapp(e: AlertaEstudiante): string | null {
    return enlaceWhatsApp(
      e.telefonoAcudiente,
      `Buenos días, ${e.acudiente}. Le escribimos de la I.E. José de la Vega sobre ${e.nombreCompleto}: queremos acordar una cita para apoyarle en su proceso escolar.`,
    );
  }

  protected exportar(): void {
    descargarCsv(
      'alerta-temprana.csv',
      ['Estudiante', 'Documento', 'Curso', 'Nivel', 'Puntaje', 'Motivos', 'Fallas 30 días', 'Fallas año', 'Perdidas', 'Promedio', 'Acudiente', 'Teléfono'],
      this.visibles().map((e) => [
        e.nombreCompleto,
        e.documento,
        `${nombreGrado(e.grado)} ${e.grupo ?? ''}`.trim(),
        e.nivel,
        e.puntaje,
        e.motivos.join('; '),
        e.ausencias30Dias,
        e.ausenciasAnio,
        e.perdidasAcumuladas,
        e.promedio ?? '',
        e.acudiente ?? '',
        e.telefonoAcudiente ?? '',
      ]),
    );
  }

  protected imprimir(): void {
    window.print();
  }
}

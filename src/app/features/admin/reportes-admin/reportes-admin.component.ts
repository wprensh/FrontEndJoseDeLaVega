import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { Curso, DESEMPENOS, formatoNota } from '../../../core/models/academico.model';
import { GRADOS, nombreGrado } from '../../../core/models/campus.model';
import { Certificado } from '../../../core/models/certificado.model';
import { DECISIONES, FilaSimat, LibroFinal } from '../../../core/models/mejoras.model';
import { AcademicoAdminService } from '../../../core/services/academico-admin.service';
import { PanelMejorasService } from '../../../core/services/mejoras.service';
import { SesionService } from '../../../core/services/sesion.service';
import { descargarCsv } from '../../../core/utils/csv';
import { mensajeDeError } from '../../../core/utils/http-error';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';

/** Clase del <body> que deja visible solo la hoja al imprimir (ver styles.scss). */
const CLASE_IMPRESION = 'imprimiendo-certificado';

/**
 * Reportes oficiales: matrícula en formato tipo SIMAT, libro final de calificaciones por curso y certificado
 * de estudios con las notas del año y código de verificación.
 */
@Component({
  selector: 'app-reportes-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    PageHeadingComponent,
  ],
  template: `
    <div class="contenedor">
      <app-page-heading
        class="no-imprimir"
        titulo="Reportes oficiales"
        subtitulo="SIMAT, libro final de calificaciones y certificados de estudio"
        etiqueta="Panel administrativo"
      />

      @if (error(); as e) {
        <p class="aviso-error no-imprimir" role="alert">{{ e }}</p>
      }

      <mat-tab-group class="tarjeta pestanas" animationDuration="0ms" mat-stretch-tabs="false" (selectedIndexChange)="pestana.set($event)">
        <!-- ===== SIMAT ===== -->
        <mat-tab label="Matrícula (SIMAT)">
          <div class="barra-filtros pestana no-imprimir">
            <mat-form-field>
              <mat-label>Grado</mat-label>
              <mat-select [(ngModel)]="gradoSimat" (ngModelChange)="cargarSimat()">
                <mat-option [value]="null">Todos</mat-option>
                @for (g of grados; track g) {
                  <mat-option [value]="g">{{ grado(g) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <span class="texto-suave">{{ simat().length }} estudiantes · {{ incompletos() }} con datos incompletos</span>
            <span class="espacio"></span>
            <button mat-stroked-button type="button" [disabled]="!simat().length" (click)="exportarSimat()">
              <mat-icon aria-hidden="true">download</mat-icon> Descargar CSV
            </button>
          </div>
          <p class="texto-suave">
            Columnas en el orden del anexo de matrícula del SIMAT para conciliar con la Secretaría de Educación. Complete en Comunidad
            los datos que falten (fecha de nacimiento, dirección, EPS y acudiente).
          </p>
          <div class="tabla-desplazable">
            <table class="tabla-datos">
              <thead>
                <tr><th scope="col">Doc.</th><th scope="col">Número</th><th scope="col">Apellidos</th><th scope="col">Nombres</th><th scope="col">Nacimiento</th><th scope="col">Grado</th><th scope="col">Acudiente</th><th scope="col"></th></tr>
              </thead>
              <tbody>
                @for (f of simat(); track f.estudianteId) {
                  <tr>
                    <td>{{ f.tipoDocumento }}</td>
                    <td>{{ f.documento }}</td>
                    <td>{{ f.apellido1 }} {{ f.apellido2 ?? '' }}</td>
                    <td>{{ f.nombre1 }} {{ f.nombre2 ?? '' }}</td>
                    <td>{{ f.fechaNacimiento ? (f.fechaNacimiento | date: 'dd/MM/y') : '—' }}</td>
                    <td>{{ grado(f.grado) }} {{ f.grupo ?? '' }}</td>
                    <td>{{ f.acudiente ?? '—' }}</td>
                    <td>
                      @if (!f.datosCompletos) {
                        <span class="etiqueta-estado" data-tono="alerta">Incompleto</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="texto-suave">No hay estudiantes activos con ese filtro.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </mat-tab>

        <!-- ===== Libro final ===== -->
        <mat-tab label="Libro final">
          <div class="barra-filtros pestana no-imprimir">
            <mat-form-field>
              <mat-label>Año</mat-label>
              <mat-select [(ngModel)]="anio">
                @for (a of anios; track a) {
                  <mat-option [value]="a">{{ a }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Curso</mat-label>
              <mat-select [(ngModel)]="curso">
                @for (c of cursos(); track $index) {
                  <mat-option [value]="c">{{ grado(c.grado) }} {{ c.grupo ?? '' }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-flat-button class="boton-azul" type="button" [disabled]="!curso || cargando()" (click)="cargarLibro()">Generar</button>
            @if (libro()) {
              <button mat-stroked-button type="button" (click)="imprimir()"><mat-icon aria-hidden="true">print</mat-icon> Imprimir</button>
            }
          </div>
          @if (cargando()) {
            <mat-progress-bar mode="indeterminate" aria-label="Generando libro final" />
          }
          @if (libro(); as l) {
            <div class="hoja libro">
              <header class="membrete">
                <img src="img/escudo.png" alt="" width="56" height="56" />
                <div>
                  <strong>INSTITUCIÓN EDUCATIVA JOSÉ DE LA VEGA</strong>
                  <span>Libro final de calificaciones {{ l.anio }} · {{ grado(l.grado) }} {{ l.grupo ?? '' }}</span>
                  <span class="texto-suave">DANE 113001001816 · Generado {{ l.generadoEn | date: 'd/MM/y h:mm a' }}@if (!l.anioCerrado) { · año en curso (preliminar)}</span>
                </div>
              </header>
              @for (e of l.estudiantes; track e.estudianteId; let i = $index) {
                <section class="estudiante">
                  <h3>{{ i + 1 }}. {{ e.nombreCompleto }} <small>· {{ e.documento }}</small></h3>
                  <table class="tabla-datos">
                    <thead>
                      <tr>
                        <th scope="col">Asignatura</th>
                        @for (p of l.periodos; track p.id) {
                          <th scope="col" class="numero">P{{ p.numero }} ({{ p.porcentaje }}%)</th>
                        }
                        <th scope="col" class="numero">Final</th>
                        <th scope="col">Desempeño</th>
                        <th scope="col" class="numero">Fallas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (a of e.asignaturas; track a.asignatura) {
                        <tr [class.perdida]="a.final !== null && a.final < 3">
                          <td>{{ a.asignatura }}</td>
                          @for (n of a.notasPeriodos; track $index) {
                            <td class="numero">{{ nota(n) }}</td>
                          }
                          <td class="numero"><strong>{{ nota(a.final) }}</strong></td>
                          <td>{{ a.desempeno ? desempenos[a.desempeno] : '—' }}</td>
                          <td class="numero">{{ a.fallas }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <p class="resultado">
                    Promedio {{ nota(e.promedio) }} · Puesto {{ e.puesto ?? '—' }} · {{ e.perdidas }} perdida(s) · {{ e.fallas }} fallas ·
                    <strong>{{ e.resultado }}</strong>@if (e.decision) { ({{ decisiones[e.decision] }})}
                  </p>
                </section>
              } @empty {
                <p class="texto-suave">El curso no tiene estudiantes o aún no hay notas.</p>
              }
            </div>
          }
        </mat-tab>

        <!-- ===== Certificado de estudios ===== -->
        <mat-tab label="Certificado de estudios">
          <div class="pestana">
            <p class="texto-suave no-imprimir">
              Expide el certificado con las calificaciones finales del año, el código de verificación y queda en el registro de
              Certificados.
            </p>
            <div class="formulario-rejilla no-imprimir">
              <mat-form-field>
                <mat-label>Buscar estudiante</mat-label>
                <input matInput [(ngModel)]="busqueda" placeholder="Nombre o documento" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Estudiante</mat-label>
                <mat-select [(ngModel)]="estudianteId">
                  @for (f of candidatosCertificado(); track f.estudianteId) {
                    <mat-option [value]="f.estudianteId">{{ f.apellido1 }} {{ f.apellido2 ?? '' }} {{ f.nombre1 }} {{ f.nombre2 ?? '' }} · {{ grado(f.grado) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Año lectivo</mat-label>
                <mat-select [(ngModel)]="anioCertificado">
                  @for (a of anios; track a) {
                    <mat-option [value]="a">{{ a }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Firma</mat-label>
                <input matInput maxlength="150" [(ngModel)]="firmanteNombre" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Cargo</mat-label>
                <input matInput maxlength="100" [(ngModel)]="firmanteCargo" />
              </mat-form-field>
            </div>
            <div class="acciones-fila no-imprimir">
              @if (puedeCrear) {
                <button mat-flat-button class="boton-azul" type="button" [disabled]="!estudianteId || cargando()" (click)="expedir()">
                  <mat-icon aria-hidden="true">workspace_premium</mat-icon> Expedir certificado
                </button>
              }
              @if (certificado()) {
                <button mat-stroked-button type="button" (click)="imprimir()"><mat-icon aria-hidden="true">print</mat-icon> Imprimir</button>
              }
            </div>

            @if (certificado(); as c) {
              <article class="hoja certificado">
                <header class="membrete centrado">
                  <img src="img/escudo.png" alt="" width="80" height="80" />
                  <strong>INSTITUCIÓN EDUCATIVA JOSÉ DE LA VEGA</strong>
                  <span>Cartagena de Indias D. T. y C. · DANE 113001001816 · NIT 806.012.497-2</span>
                </header>
                <h2>{{ c.titulo }}</h2>
                <div class="contenido pre-linea">{{ c.contenido }}</div>
                <p>Se expide en Cartagena de Indias el {{ c.fechaExpedicion | date: "d 'de' MMMM 'de' y" }}.</p>
                <div class="firma">
                  <span class="linea"></span>
                  <strong>{{ c.firmanteNombre }}</strong>
                  <span>{{ c.firmanteCargo }}</span>
                </div>
                <p class="verificacion">Código de verificación <strong>{{ c.codigo }}</strong> · verifique en {{ urlVerificacion(c.codigo) }}</p>
              </article>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .pestana {
      margin-block: 1rem;
    }

    .espacio {
      flex: 1;
    }

    .membrete {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-block-end: 0.75rem;
      margin-block-end: 1rem;
      border-block-end: 2px solid var(--jv-azul);

      div {
        display: grid;
      }

      &.centrado {
        flex-direction: column;
        text-align: center;
        gap: 0.25rem;
      }
    }

    .estudiante {
      margin-block-end: 1.25rem;
      break-inside: avoid;

      h3 {
        margin: 0 0 0.4rem;
        color: var(--jv-azul);
        font-size: 1rem;
      }
    }

    .perdida td {
      color: var(--jv-rojo);
    }

    .resultado {
      margin: 0.4rem 0 0;
      font-size: 0.9rem;
    }

    .certificado {
      max-inline-size: 760px;
      margin: 1.5rem auto 0;
      padding: 2rem;
      border: 1px solid var(--jv-borde);

      h2 {
        text-align: center;
        color: var(--jv-azul);
      }

      .contenido {
        line-height: 1.7;
        text-align: justify;
      }
    }

    .firma {
      display: grid;
      justify-items: center;
      margin-block: 4rem 1.5rem;

      .linea {
        inline-size: 280px;
        border-block-start: 1px solid var(--jv-texto);
      }
    }

    .verificacion {
      font-size: 0.85rem;
      text-align: center;
    }

    @media print {
      .tabla-datos {
        font-size: 0.75rem;
      }

      .certificado {
        border: none;
        padding: 0;
      }
    }
  `,
})
export class ReportesAdminComponent implements OnInit, OnDestroy {
  readonly #servicio = inject(PanelMejorasService);
  readonly #academico = inject(AcademicoAdminService);
  readonly #snackBar = inject(MatSnackBar);
  readonly #sesion = inject(SesionService);

  protected readonly anios = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
  protected readonly grados = GRADOS;
  protected readonly grado = nombreGrado;
  protected readonly nota = formatoNota;
  protected readonly desempenos = DESEMPENOS;
  protected readonly decisiones = DECISIONES;
  protected readonly puedeCrear = this.#sesion.puede('Reportes', 'Crear');

  protected readonly pestana = signal(0);
  protected readonly simat = signal<FilaSimat[]>([]);
  protected readonly cursos = signal<Curso[]>([]);
  protected readonly libro = signal<LibroFinal | null>(null);
  protected readonly certificado = signal<Certificado | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busquedaTexto = signal('');
  protected readonly incompletos = computed(() => this.simat().filter((f) => !f.datosCompletos).length);
  protected readonly candidatosCertificado = computed(() => {
    const texto = this.busquedaTexto().trim().toLowerCase();
    const lista = this.simat();
    return texto
      ? lista.filter((f) => `${f.nombre1} ${f.nombre2 ?? ''} ${f.apellido1} ${f.apellido2 ?? ''} ${f.documento}`.toLowerCase().includes(texto))
      : lista;
  });

  protected gradoSimat: number | null = null;
  protected anio = this.anios[0];
  protected curso: Curso | null = null;
  protected estudianteId: string | null = null;
  protected anioCertificado = this.anios[0];
  protected firmanteNombre = 'YOLIMA LUZ ESCORCIA VASQUEZ';
  protected firmanteCargo = 'Rectora';

  protected get busqueda(): string {
    return this.busquedaTexto();
  }

  protected set busqueda(valor: string) {
    this.busquedaTexto.set(valor);
  }

  async ngOnInit(): Promise<void> {
    document.body.classList.add(CLASE_IMPRESION);
    this.#academico
      .cursos()
      .then((c) => this.cursos.set(c))
      .catch(() => undefined);
    await this.cargarSimat();
  }

  ngOnDestroy(): void {
    document.body.classList.remove(CLASE_IMPRESION);
  }

  protected async cargarSimat(): Promise<void> {
    try {
      this.simat.set(await this.#servicio.simat(this.gradoSimat));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  protected exportarSimat(): void {
    descargarCsv(
      `simat${this.gradoSimat === null ? '' : '-grado-' + this.gradoSimat}.csv`,
      [
        'TIPO_DOCUMENTO', 'DOCUMENTO', 'APELLIDO1', 'APELLIDO2', 'NOMBRE1', 'NOMBRE2', 'FECHA_NACIMIENTO', 'GRADO', 'GRUPO', 'JORNADA',
        'DIRECCION', 'EPS', 'ACUDIENTE', 'DOC_ACUDIENTE', 'TEL_ACUDIENTE', 'INSTITUCION_ANTERIOR',
      ],
      this.simat().map((f) => [
        f.tipoDocumento, f.documento, f.apellido1, f.apellido2 ?? '', f.nombre1, f.nombre2 ?? '', f.fechaNacimiento ?? '', f.grado,
        f.grupo ?? '', f.jornada, f.direccion ?? '', f.eps ?? '', f.acudiente ?? '', f.documentoAcudiente ?? '', f.telefonoAcudiente ?? '',
        f.colegioProcedencia ?? '',
      ]),
    );
  }

  protected async cargarLibro(): Promise<void> {
    if (!this.curso) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.libro.set(await this.#servicio.libroFinal(this.anio, this.curso.grado, this.curso.grupo));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async expedir(): Promise<void> {
    if (!this.estudianteId) {
      return;
    }
    this.cargando.set(true);
    try {
      this.certificado.set(
        await this.#servicio.certificadoEstudios({
          estudianteId: this.estudianteId,
          anio: this.anioCertificado,
          firmanteNombre: this.firmanteNombre.trim(),
          firmanteCargo: this.firmanteCargo.trim(),
          tipoDocumento: null,
        }),
      );
      this.#snackBar.open('Certificado expedido. Ya puede imprimirlo.', 'Cerrar', { duration: 4000 });
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    } finally {
      this.cargando.set(false);
    }
  }

  protected urlVerificacion(codigo: string): string {
    return `${document.baseURI.replace(/\/$/, '')}/verificar/${codigo}`;
  }

  protected imprimir(): void {
    window.print();
  }
}

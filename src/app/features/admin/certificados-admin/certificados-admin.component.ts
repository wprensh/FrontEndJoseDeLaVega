import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormGroupDirective, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { INSTITUCION } from '../../../core/institucion';
import {
  Certificado,
  DocumentoCertificado,
  ExpedirCertificado,
  GRADOS,
  TIPOS_CERTIFICADO,
  TIPOS_DOCUMENTO,
  TipoCertificado,
  TipoDocumento,
  plantillaDe,
  siglaDocumento,
  tieneMarcadores,
} from '../../../core/models/certificado.model';
import { paginadorEnEspanol } from '../../../core/paginador-intl';
import { CertificadosService } from '../../../core/services/certificados.service';
import { PqrsService } from '../../../core/services/pqrs.service';
import { SesionAdminService } from '../../../core/services/sesion-admin.service';
import { aFechaIso, desdeFechaIso } from '../../../core/utils/fechas';
import { aplicarErroresDeServidor, mensajeDeError } from '../../../core/utils/http-error';
import { CertificadoDocumentoComponent } from '../../../shared/certificado-documento/certificado-documento.component';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { AnularCertificadoDialogComponent } from './anular-certificado-dialog.component';

/** Quien firma suele ser siempre el mismo: se recuerda en este navegador. */
const CLAVE_FIRMANTE = 'jv-firmante-certificados';

/** Clase del <body> que deja visible solo la hoja del certificado al imprimir (ver styles.scss). */
const CLASE_IMPRESION = 'imprimiendo-certificado';

/**
 * Panel de certificaciones: expide certificados con el membrete institucional,
 * muestra la vista previa en vivo, los imprime (o guarda en PDF) y lleva el registro con su anulación.
 */
@Component({
  selector: 'app-certificados-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    CertificadoDocumentoComponent,
    PageHeadingComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginadorEnEspanol }],
  templateUrl: './certificados-admin.component.html',
  styleUrl: './certificados-admin.component.scss',
})
export class CertificadosAdminComponent implements OnInit {
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #dialog = inject(MatDialog);
  readonly #snackBar = inject(MatSnackBar);
  readonly #pqrs = inject(PqrsService);
  readonly #destroyRef = inject(DestroyRef);
  protected readonly servicio = inject(CertificadosService);
  protected readonly sesion = inject(SesionAdminService);

  // ---- Acceso con la clave de administración ----
  protected readonly formularioAcceso = this.#fb.group({ clave: ['', Validators.required] });
  protected readonly campoClave = this.formularioAcceso.controls.clave;
  protected readonly verificandoClave = signal(false);
  protected readonly errorClave = signal<string | null>(null);

  protected readonly tipos = TIPOS_CERTIFICADO;
  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly grados = GRADOS;
  protected readonly plantillaDe = plantillaDe;
  protected readonly sigla = siglaDocumento;
  protected readonly aFecha = desdeFechaIso;
  protected readonly columnas = ['codigo', 'beneficiario', 'tipo', 'fecha', 'estado', 'acciones'] as const;
  protected readonly porId = (_: number, certificado: Certificado): string => certificado.id;

  // ---- Estado de la vista ----
  protected readonly busqueda = signal('');
  protected readonly filtroTipo = signal<TipoCertificado | ''>('');
  protected readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(10);
  /** Certificado expedido que se está viendo; null = vista previa del formulario. */
  protected readonly seleccionado = signal<Certificado | null>(null);
  protected readonly expidiendo = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  /** Si el administrador modificó el texto a mano, ya no se reemplaza al cambiar los datos. */
  protected readonly textoEditado = signal(false);

  // ---- Formulario reactivo tipado ----
  protected readonly formulario = this.#fb.group({
    tipo: ['Estudios' as TipoCertificado, Validators.required],
    titulo: [plantillaDe('Estudios').titulo, [Validators.required, Validators.maxLength(150)]],
    nombreBeneficiario: ['', [Validators.required, Validators.maxLength(150)]],
    tipoDocumento: ['TarjetaIdentidad' as TipoDocumento, Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9.-]+$/)]],
    grado: ['', Validators.maxLength(50)],
    anioLectivo: [new Date().getFullYear() as number | null, [Validators.min(1950), Validators.max(2100)]],
    contenido: ['', [Validators.required, Validators.maxLength(5000)]],
    fechaExpedicion: [new Date(), Validators.required],
    firmanteNombre: [INSTITUCION.rectoria.nombre as string, [Validators.required, Validators.maxLength(120)]],
    firmanteCargo: [INSTITUCION.rectoria.cargo as string, [Validators.required, Validators.maxLength(80)]],
  });

  /** Directiva del formulario: permite reiniciar su estado "enviado" para que no queden errores en rojo. */
  private readonly directivaFormulario = viewChild('formExpedir', { read: FormGroupDirective });

  readonly #valor = toSignal(this.formulario.valueChanges, { initialValue: this.formulario.getRawValue() });

  protected readonly plantilla = computed(() => plantillaDe(this.#valor().tipo ?? 'Personalizado'));

  protected readonly gradosFiltrados = computed(() => {
    const texto = (this.#valor().grado ?? '').toLowerCase();
    return this.grados.filter((g) => g.toLowerCase().includes(texto));
  });

  /** Lo que se dibuja en la hoja: el certificado seleccionado o el borrador del formulario. */
  protected readonly documento = computed<DocumentoCertificado>(() => {
    const seleccionado = this.seleccionado();
    if (seleccionado) {
      return seleccionado;
    }
    const v = this.formulario.getRawValue();
    this.#valor(); // Dependencia: se recalcula con cada cambio del formulario.
    return {
      codigo: null,
      tipo: v.tipo,
      titulo: v.titulo,
      nombreBeneficiario: v.nombreBeneficiario,
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento,
      grado: v.grado || null,
      anioLectivo: v.anioLectivo,
      contenido: v.contenido,
      fechaExpedicion: v.fechaExpedicion ? aFechaIso(v.fechaExpedicion) : '',
      firmanteNombre: v.firmanteNombre,
      firmanteCargo: v.firmanteCargo,
      anulado: false,
    };
  });

  constructor() {
    this.#restaurarFirmante();
    this.#redactar();

    // Al cambiar de tipo se proponen el título y el texto de ese tipo.
    this.formulario.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.formulario.controls.titulo.setValue(plantillaDe(tipo).titulo);
      this.textoEditado.set(false);
      this.#redactar();
    });

    // Mientras el texto no se haya editado a mano, se mantiene al día con los datos del beneficiario.
    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.#redactar());

    this.#destroyRef.onDestroy(() => document.body.classList.remove(CLASE_IMPRESION));
  }

  ngOnInit(): void {
    if (this.sesion.activa()) {
      void this.recargar();
    }
  }

  // ---------------- Acceso ----------------

  protected async ingresar(): Promise<void> {
    if (this.campoClave.invalid) {
      this.campoClave.markAsTouched();
      return;
    }

    this.verificandoClave.set(true);
    this.errorClave.set(null);
    this.sesion.iniciar(this.campoClave.value);

    try {
      if (await this.#pqrs.verificarAccesoAdmin()) {
        this.campoClave.reset();
        await this.recargar();
      } else {
        this.sesion.cerrar();
        this.errorClave.set('La clave no es correcta.');
      }
    } catch (error) {
      this.sesion.cerrar();
      this.errorClave.set(mensajeDeError(error));
    } finally {
      this.verificandoClave.set(false);
    }
  }

  protected salir(): void {
    this.sesion.cerrar();
    this.seleccionado.set(null);
  }

  // ---------------- Listado ----------------

  protected recargar(): Promise<void> {
    return this.servicio.cargar({
      buscar: this.busqueda().trim() || undefined,
      tipo: this.filtroTipo() || undefined,
      pagina: this.pagina(),
      tamanoPagina: this.tamanoPagina(),
    });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(1);
    void this.recargar();
  }

  protected filtrarTipo(tipo: TipoCertificado | ''): void {
    this.filtroTipo.set(tipo);
    this.pagina.set(1);
    void this.recargar();
  }

  protected cambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex + 1);
    this.tamanoPagina.set(evento.pageSize);
    void this.recargar();
  }

  // ---------------- Redacción ----------------

  protected marcarTextoEditado(): void {
    this.textoEditado.set(true);
  }

  /** Vuelve al texto sugerido del tipo seleccionado con los datos actuales. */
  protected restaurarTexto(): void {
    this.textoEditado.set(false);
    this.#redactar();
  }

  #redactar(): void {
    if (this.textoEditado()) {
      return;
    }
    const v = this.formulario.getRawValue();
    const texto = plantillaDe(v.tipo).redactar({
      nombre: v.nombreBeneficiario,
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento,
      grado: v.grado,
      anioLectivo: v.anioLectivo,
    });
    if (this.formulario.controls.contenido.value !== texto) {
      this.formulario.controls.contenido.setValue(texto);
    }
  }

  // ---------------- Expedir ----------------

  protected async expedir(): Promise<void> {
    this.errorFormulario.set(null);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.getRawValue();
    if (tieneMarcadores(v.contenido) || tieneMarcadores(v.titulo)) {
      this.errorFormulario.set('Complete o borre los datos entre corchetes [ ] antes de expedir el certificado.');
      return;
    }

    const datos: ExpedirCertificado = {
      tipo: v.tipo,
      titulo: v.titulo.trim(),
      nombreBeneficiario: v.nombreBeneficiario.trim(),
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento.trim(),
      grado: v.grado.trim() || null,
      anioLectivo: v.anioLectivo || null,
      contenido: v.contenido.trim(),
      fechaExpedicion: aFechaIso(v.fechaExpedicion),
      firmanteNombre: v.firmanteNombre.trim(),
      firmanteCargo: v.firmanteCargo.trim(),
    };

    this.expidiendo.set(true);
    try {
      const certificado = await this.servicio.expedir(datos);
      this.#guardarFirmante(datos.firmanteNombre, datos.firmanteCargo);
      this.seleccionado.set(certificado);
      this.#snackBar.open(`Certificado ${certificado.codigo} expedido. Ya puede imprimirlo.`, 'Cerrar');
      this.#limpiarBeneficiario();
      this.pagina.set(1);
      await this.recargar();
    } catch (error) {
      if (!aplicarErroresDeServidor(this.formulario, error)) {
        this.errorFormulario.set(mensajeDeError(error));
      }
    } finally {
      this.expidiendo.set(false);
    }
  }

  /** Conserva tipo, fecha y firmante para expedir varios seguidos; borra los datos de la persona. */
  #limpiarBeneficiario(): void {
    const valor = { ...this.formulario.getRawValue(), nombreBeneficiario: '', numeroDocumento: '', grado: '' };
    this.textoEditado.set(false);
    const directiva = this.directivaFormulario();
    if (directiva) {
      directiva.resetForm(valor);
    } else {
      this.formulario.reset(valor);
    }
    this.#redactar();
  }

  // ---------------- Acciones del listado ----------------

  protected ver(certificado: Certificado): void {
    this.seleccionado.set(certificado);
    document.getElementById('vista-previa')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected volverAlFormulario(): void {
    this.seleccionado.set(null);
  }

  /** Copia los datos de un certificado al formulario para expedir uno nuevo (p. ej. tras anular uno con errores). */
  protected duplicar(certificado: Certificado): void {
    this.formulario.patchValue(
      {
        tipo: certificado.tipo,
        titulo: certificado.titulo,
        nombreBeneficiario: certificado.nombreBeneficiario,
        tipoDocumento: certificado.tipoDocumento,
        numeroDocumento: certificado.numeroDocumento,
        grado: certificado.grado ?? '',
        anioLectivo: certificado.anioLectivo,
        contenido: certificado.contenido,
        fechaExpedicion: new Date(),
        firmanteNombre: certificado.firmanteNombre,
        firmanteCargo: certificado.firmanteCargo,
      },
      { emitEvent: false },
    );
    this.textoEditado.set(true);
    this.formulario.updateValueAndValidity(); // Notifica una sola vez a la vista previa.
    this.seleccionado.set(null);
    document.getElementById('titulo-formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected async anular(certificado: Certificado): Promise<void> {
    const motivo = await firstValueFrom(
      this.#dialog
        .open<AnularCertificadoDialogComponent, Certificado, string>(AnularCertificadoDialogComponent, {
          data: certificado,
          width: '480px',
        })
        .afterClosed(),
    );

    if (!motivo) {
      return;
    }

    try {
      const anulado = await this.servicio.anular(certificado.id, motivo);
      if (this.seleccionado()?.id === anulado.id) {
        this.seleccionado.set(anulado);
      }
      this.#snackBar.open(`Certificado ${anulado.codigo} anulado.`, 'Cerrar');
    } catch (error) {
      this.#snackBar.open(mensajeDeError(error), 'Cerrar');
    }
  }

  /** Imprime solo la hoja (el navegador también permite "Guardar como PDF"). */
  protected imprimir(): void {
    document.body.classList.add(CLASE_IMPRESION);
    window.addEventListener('afterprint', () => document.body.classList.remove(CLASE_IMPRESION), { once: true });
    window.print();
  }

  // ---------------- Firmante recordado ----------------

  #restaurarFirmante(): void {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_FIRMANTE) ?? 'null') as {
        nombre?: string;
        cargo?: string;
      } | null;
      if (guardado?.nombre) {
        this.formulario.patchValue({ firmanteNombre: guardado.nombre, firmanteCargo: guardado.cargo ?? '' });
      }
    } catch {
      // Sin almacenamiento o con un valor dañado se empieza en blanco.
    }
  }

  #guardarFirmante(nombre: string, cargo: string): void {
    try {
      localStorage.setItem(CLAVE_FIRMANTE, JSON.stringify({ nombre, cargo }));
    } catch {
      // El firmante simplemente no se recordará.
    }
  }
}

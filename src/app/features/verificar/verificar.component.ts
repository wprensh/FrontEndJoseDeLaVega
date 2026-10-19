import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';

import { INSTITUCION } from '../../core/institucion';
import { VerificacionCertificado } from '../../core/models/certificado.model';
import { CertificadosService } from '../../core/services/certificados.service';
import { desdeFechaIso } from '../../core/utils/fechas';
import { mensajeDeError } from '../../core/utils/http-error';
import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';

type Resultado =
  | { readonly estado: 'valido' | 'anulado'; readonly certificado: VerificacionCertificado }
  | { readonly estado: 'inexistente'; readonly codigo: string }
  | { readonly estado: 'error'; readonly mensaje: string };

/**
 * Verificación pública de certificados: quien recibe un certificado (otra institución, una empresa)
 * escanea el QR o escribe el código y confirma que el documento es auténtico y sigue vigente.
 */
@Component({
  selector: 'app-verificar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeadingComponent,
  ],
  templateUrl: './verificar.component.html',
  styleUrl: './verificar.component.scss',
})
export class VerificarComponent implements OnInit {
  readonly #servicio = inject(CertificadosService);
  readonly #router = inject(Router);

  /** Código desde la URL (/verificar/CERT-2026-0A1B2C), así funciona el enlace del QR. */
  readonly codigo = input<string>();

  protected readonly institucion = INSTITUCION;
  protected readonly aFecha = desdeFechaIso;
  protected readonly campoCodigo = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.maxLength(20),
  ]);
  protected readonly consultando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);

  ngOnInit(): void {
    const codigo = this.codigo();
    if (codigo) {
      this.campoCodigo.setValue(codigo.toUpperCase());
      void this.consultar(codigo);
    }
  }

  protected enviar(): void {
    if (this.campoCodigo.invalid) {
      this.campoCodigo.markAsTouched();
      return;
    }
    const codigo = this.campoCodigo.value.trim().toUpperCase();
    // La URL queda con el código para poder compartir el resultado.
    void this.#router.navigate(['/verificar', codigo], { replaceUrl: true });
    void this.consultar(codigo);
  }

  protected async consultar(codigo: string): Promise<void> {
    this.consultando.set(true);
    this.resultado.set(null);
    try {
      const certificado = await this.#servicio.verificar(codigo);
      this.resultado.set({ estado: certificado.anulado ? 'anulado' : 'valido', certificado });
    } catch (error) {
      this.resultado.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? { estado: 'inexistente', codigo: codigo.toUpperCase() }
          : { estado: 'error', mensaje: mensajeDeError(error) },
      );
    } finally {
      this.consultando.set(false);
    }
  }
}

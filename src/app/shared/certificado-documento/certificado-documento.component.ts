import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { INSTITUCION } from '../../core/institucion';
import { DocumentoCertificado, plantillaDe, siglaDocumento } from '../../core/models/certificado.model';
import { fechaEnLetras } from '../../core/utils/fechas';
import { EscudoComponent } from '../escudo/escudo.component';

interface Fragmento {
  readonly texto: string;
  readonly resaltado: boolean;
}

/**
 * Hoja tamaño carta con el membrete y el escudo de la institución.
 *
 * En pantalla se escala al ancho disponible (todas las medidas están en `em` y el tamaño de letra
 * depende del ancho del contenedor); al imprimir ocupa exactamente una hoja carta.
 * Con código muestra el QR de verificación; sin código es una vista previa.
 */
@Component({
  selector: 'app-certificado-documento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EscudoComponent],
  templateUrl: './certificado-documento.component.html',
  styleUrl: './certificado-documento.component.scss',
})
export class CertificadoDocumentoComponent {
  readonly certificado = input.required<DocumentoCertificado>();

  protected readonly institucion = INSTITUCION;
  protected readonly qr = signal<string | null>(null);

  protected readonly verbo = computed(() => plantillaDe(this.certificado().tipo).verbo);
  protected readonly sigla = computed(() => siglaDocumento(this.certificado().tipoDocumento));
  protected readonly cierre = computed(() => {
    const fecha = this.certificado().fechaExpedicion;
    return fecha ? `Para constancia se firma en ${INSTITUCION.ciudad}, ${fechaEnLetras(fecha)}.` : '';
  });

  /** Dirección pública donde cualquiera puede comprobar el código (respeta el base href del sitio). */
  protected readonly urlVerificacion = computed(() => {
    const codigo = this.certificado().codigo;
    return codigo ? new URL(`verificar/${codigo}`, document.baseURI).href : null;
  });

  /** Párrafos del texto, con el nombre del beneficiario resaltado en negrita donde aparezca. */
  protected readonly parrafos = computed<Fragmento[][]>(() => {
    const { contenido, nombreBeneficiario } = this.certificado();
    const nombre = nombreBeneficiario.trim().toUpperCase();

    return contenido
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((parrafo) => {
        if (!nombre) {
          return [{ texto: parrafo, resaltado: false }];
        }
        return parrafo
          .split(nombre)
          .flatMap((texto, i) => [
            ...(i > 0 ? [{ texto: nombre, resaltado: true }] : []),
            { texto, resaltado: false },
          ])
          .filter((f) => f.texto);
      });
  });

  constructor() {
    effect(() => {
      const url = this.urlVerificacion();
      this.qr.set(null);
      if (url) {
        void this.#generarQr(url);
      }
    });
  }

  /** La librería del QR se descarga solo cuando hay un certificado expedido que mostrar. */
  async #generarQr(url: string): Promise<void> {
    const { toDataURL } = await import('qrcode');
    const imagen = await toDataURL(url, { margin: 0, width: 240, color: { dark: '#0a2647', light: '#ffffff' } });
    // Si cambió el certificado mientras se generaba, se descarta.
    if (this.urlVerificacion() === url) {
      this.qr.set(imagen);
    }
  }
}

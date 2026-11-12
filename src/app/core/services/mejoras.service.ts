import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Certificado, TipoDocumento } from '../models/certificado.model';
import {
  Acta,
  Actividad,
  Alertas,
  ArchivoAula,
  AulaEstudiante,
  Bandeja,
  CalificarEntrega,
  CandidatosComision,
  ContactoMensaje,
  Conversacion,
  EntregasActividad,
  EstadoPlaneacion,
  FilaSimat,
  GuardarActa,
  GuardarActividad,
  GuardarPlanEstudios,
  GuardarPlaneacion,
  LibroFinal,
  PasoPlanilla,
  PlanEstudios,
  Planeacion,
  Recuperacion,
  RecuperacionesClase,
} from '../models/mejoras.model';
import { parametros } from './academico-admin.service';
import { URL_CAMPUS } from './campus.service';

const URL_DOCENTE = `${URL_CAMPUS}/docente`;

/**
 * Aula virtual, mensajería, planeador y recuperaciones del campus (estudiantes, acudientes y docentes).
 */
@Injectable({ providedIn: 'root' })
export class CampusMejorasService {
  readonly #http = inject(HttpClient);
  readonly #mensajesSinLeer = signal(0);

  readonly mensajesSinLeer = this.#mensajesSinLeer.asReadonly();

  // ---- Aula virtual (familia) ----

  miAula(estudianteId?: string | null): Promise<AulaEstudiante> {
    const params = estudianteId ? new HttpParams().set('estudianteId', estudianteId) : undefined;
    return firstValueFrom(this.#http.get<AulaEstudiante>(`${URL_CAMPUS}/aula`, { params }));
  }

  entregar(actividadId: string, cuerpo: { texto: string | null; enlace: string | null; archivoId: string | null }): Promise<Actividad> {
    return firstValueFrom(this.#http.post<Actividad>(`${URL_CAMPUS}/aula/actividades/${actividadId}/entrega`, cuerpo));
  }

  subirArchivo(archivo: File): Promise<ArchivoAula> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return firstValueFrom(this.#http.post<ArchivoAula>(`${URL_CAMPUS}/aula/archivos`, datos));
  }

  /** Descarga con el token del campus (el enlace directo no lleva la autorización). */
  descargarArchivo(id: string): Promise<Blob> {
    return firstValueFrom(this.#http.get(`${URL_CAMPUS}/aula/archivos/${id}`, { responseType: 'blob' }));
  }

  // ---- Aula virtual (docente) ----

  actividadesClase(asignacionId: string): Promise<Actividad[]> {
    return firstValueFrom(this.#http.get<Actividad[]>(`${URL_DOCENTE}/clases/${asignacionId}/aula`));
  }

  crearActividad(asignacionId: string, actividad: GuardarActividad): Promise<Actividad> {
    return firstValueFrom(this.#http.post<Actividad>(`${URL_DOCENTE}/clases/${asignacionId}/aula`, actividad));
  }

  actualizarActividad(id: string, actividad: GuardarActividad): Promise<Actividad> {
    return firstValueFrom(this.#http.put<Actividad>(`${URL_DOCENTE}/aula/${id}`, actividad));
  }

  eliminarActividad(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${URL_DOCENTE}/aula/${id}`));
  }

  entregas(actividadId: string): Promise<EntregasActividad> {
    return firstValueFrom(this.#http.get<EntregasActividad>(`${URL_DOCENTE}/aula/${actividadId}/entregas`));
  }

  calificar(actividadId: string, calificaciones: CalificarEntrega[]): Promise<EntregasActividad> {
    return firstValueFrom(this.#http.put<EntregasActividad>(`${URL_DOCENTE}/aula/${actividadId}/entregas`, { calificaciones }));
  }

  pasarAPlanilla(asignacionId: string, periodoId: string): Promise<PasoPlanilla> {
    return firstValueFrom(this.#http.post<PasoPlanilla>(`${URL_DOCENTE}/clases/${asignacionId}/aula/planilla/${periodoId}`, {}));
  }

  // ---- Planeador docente ----

  misPlaneaciones(): Promise<Planeacion[]> {
    return firstValueFrom(this.#http.get<Planeacion[]>(`${URL_DOCENTE}/planeaciones`));
  }

  guardarPlaneacion(id: string | null, planeacion: GuardarPlaneacion): Promise<Planeacion> {
    return firstValueFrom(
      id
        ? this.#http.put<Planeacion>(`${URL_DOCENTE}/planeaciones/${id}`, planeacion)
        : this.#http.post<Planeacion>(`${URL_DOCENTE}/planeaciones`, planeacion),
    );
  }

  eliminarPlaneacion(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${URL_DOCENTE}/planeaciones/${id}`));
  }

  malla(asignacionId: string): Promise<PlanEstudios[]> {
    return firstValueFrom(this.#http.get<PlanEstudios[]>(`${URL_DOCENTE}/clases/${asignacionId}/malla`));
  }

  // ---- Recuperaciones ----

  recuperacionesClase(asignacionId: string, periodoId: string): Promise<RecuperacionesClase> {
    return firstValueFrom(this.#http.get<RecuperacionesClase>(`${URL_DOCENTE}/clases/${asignacionId}/recuperaciones/${periodoId}`));
  }

  asignarPlanes(
    asignacionId: string,
    periodoId: string,
    cuerpo: { estudianteIds: string[]; plan: string; fechaLimite: string | null },
  ): Promise<RecuperacionesClase> {
    return firstValueFrom(
      this.#http.post<RecuperacionesClase>(`${URL_DOCENTE}/clases/${asignacionId}/recuperaciones/${periodoId}`, cuerpo),
    );
  }

  calificarRecuperacion(id: string, nota: number, observacion: string | null): Promise<Recuperacion> {
    return firstValueFrom(this.#http.put<Recuperacion>(`${URL_DOCENTE}/recuperaciones/${id}`, { nota, observacion }));
  }

  misRecuperaciones(estudianteId?: string | null): Promise<Recuperacion[]> {
    const params = estudianteId ? new HttpParams().set('estudianteId', estudianteId) : undefined;
    return firstValueFrom(this.#http.get<Recuperacion[]>(`${URL_CAMPUS}/recuperaciones`, { params }));
  }

  // ---- Mensajería ----

  async bandeja(): Promise<Bandeja> {
    const bandeja = await firstValueFrom(this.#http.get<Bandeja>(`${URL_CAMPUS}/mensajes`));
    this.#mensajesSinLeer.set(bandeja.noLeidas);
    return bandeja;
  }

  contactos(): Promise<ContactoMensaje[]> {
    return firstValueFrom(this.#http.get<ContactoMensaje[]>(`${URL_CAMPUS}/mensajes/contactos`));
  }

  iniciarConversacion(cuerpo: { destinatarioId: string; estudianteId: string; asunto: string; texto: string }): Promise<Conversacion> {
    return firstValueFrom(this.#http.post<Conversacion>(`${URL_CAMPUS}/mensajes`, cuerpo));
  }

  conversacion(id: string): Promise<Conversacion> {
    return firstValueFrom(this.#http.get<Conversacion>(`${URL_CAMPUS}/mensajes/${id}`));
  }

  responder(id: string, texto: string): Promise<Conversacion> {
    return firstValueFrom(this.#http.post<Conversacion>(`${URL_CAMPUS}/mensajes/${id}`, { texto }));
  }

  cerrarConversacion(id: string): Promise<Conversacion> {
    return firstValueFrom(this.#http.post<Conversacion>(`${URL_CAMPUS}/mensajes/${id}/cerrar`, {}));
  }
}

/** Alerta temprana, planeación, comisión de evaluación y reportes oficiales del panel administrativo. */
@Injectable({ providedIn: 'root' })
export class PanelMejorasService {
  readonly #http = inject(HttpClient);
  readonly #api = environment.apiBaseUrl;

  alertas(filtro: { grado?: number | null; grupo?: string | null } = {}): Promise<Alertas> {
    return firstValueFrom(this.#http.get<Alertas>(`${this.#api}/indicadores/alertas`, { params: parametros(filtro) }));
  }

  // ---- Planeación ----

  planes(filtro: { asignaturaId?: string | null; grado?: number | null } = {}): Promise<PlanEstudios[]> {
    return firstValueFrom(this.#http.get<PlanEstudios[]>(`${this.#api}/planeacion/planes`, { params: parametros(filtro) }));
  }

  guardarPlan(plan: GuardarPlanEstudios): Promise<PlanEstudios> {
    return firstValueFrom(this.#http.put<PlanEstudios>(`${this.#api}/planeacion/planes`, plan));
  }

  eliminarPlan(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#api}/planeacion/planes/${id}`));
  }

  planeaciones(filtro: { estado?: EstadoPlaneacion | null; docenteId?: string | null } = {}): Promise<Planeacion[]> {
    return firstValueFrom(this.#http.get<Planeacion[]>(`${this.#api}/planeacion/planeaciones`, { params: parametros(filtro) }));
  }

  revisarPlaneacion(id: string, aprobar: boolean, observacion: string | null): Promise<Planeacion> {
    return firstValueFrom(
      this.#http.post<Planeacion>(`${this.#api}/planeacion/planeaciones/${id}/revision`, { aprobar, observacion }),
    );
  }

  // ---- Comisión de evaluación y promoción ----

  recuperaciones(filtro: { anio: number; periodoId?: string | null; grado?: number | null; grupo?: string | null }): Promise<Recuperacion[]> {
    return firstValueFrom(this.#http.get<Recuperacion[]>(`${this.#api}/evaluacion/recuperaciones`, { params: parametros(filtro) }));
  }

  candidatos(filtro: { anio: number; periodoId?: string | null; grado: number; grupo?: string | null }): Promise<CandidatosComision> {
    return firstValueFrom(this.#http.get<CandidatosComision>(`${this.#api}/evaluacion/candidatos`, { params: parametros(filtro) }));
  }

  actas(anio: number): Promise<Acta[]> {
    return firstValueFrom(this.#http.get<Acta[]>(`${this.#api}/evaluacion/actas`, { params: { anio } }));
  }

  guardarActa(id: string | null, acta: GuardarActa): Promise<Acta> {
    return firstValueFrom(
      id
        ? this.#http.put<Acta>(`${this.#api}/evaluacion/actas/${id}`, acta)
        : this.#http.post<Acta>(`${this.#api}/evaluacion/actas`, acta),
    );
  }

  eliminarActa(id: string): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(`${this.#api}/evaluacion/actas/${id}`));
  }

  // ---- Reportes oficiales ----

  simat(grado?: number | null): Promise<FilaSimat[]> {
    return firstValueFrom(this.#http.get<FilaSimat[]>(`${this.#api}/reportes/simat`, { params: parametros({ grado }) }));
  }

  libroFinal(anio: number, grado: number, grupo?: string | null): Promise<LibroFinal> {
    return firstValueFrom(
      this.#http.get<LibroFinal>(`${this.#api}/reportes/libro-final`, { params: parametros({ anio, grado, grupo }) }),
    );
  }

  certificadoEstudios(cuerpo: {
    estudianteId: string;
    anio: number;
    firmanteNombre: string;
    firmanteCargo: string;
    tipoDocumento: TipoDocumento | null;
  }): Promise<Certificado> {
    return firstValueFrom(this.#http.post<Certificado>(`${this.#api}/reportes/certificado-estudios`, cuerpo));
  }
}

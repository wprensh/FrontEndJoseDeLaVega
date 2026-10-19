import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Sesion } from '../models/usuario.model';
import { ENCABEZADO_CLAVE_ADMIN, SesionService } from './sesion.service';

describe('SesionService', () => {
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/auth`;

  const sesion = (expira: Date): Sesion => ({
    token: 'token-de-prueba',
    expira: expira.toISOString(),
    usuario: {
      id: '1',
      nombreUsuario: 'secretaria',
      nombreCompleto: 'Secretaría Académica',
      correo: null,
      esSuperAdministrador: false,
      permisos: ['Certificados:Ver', 'Certificados:Crear'],
    },
  });

  const crear = (): SesionService => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SesionService);
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => http.verify());

  it('inicia sesión y responde por los permisos de cada módulo', async () => {
    const servicio = crear();
    const promesa = servicio.iniciarSesion('secretaria', 'Clave1234', false);
    http.expectOne(`${url}/iniciar-sesion`).flush(sesion(new Date(Date.now() + 3_600_000)));
    await promesa;

    expect(servicio.activa()).toBeTrue();
    expect(servicio.puede('Certificados', 'Crear')).toBeTrue();
    expect(servicio.puede('Certificados', 'Eliminar')).toBeFalse();
    expect(servicio.puede('Noticias')).toBeFalse();
    expect(sessionStorage.length).toBe(1);
    expect(localStorage.length).toBe(0);
  });

  it('con "mantener la sesión" la guarda en localStorage y al cerrar la borra', async () => {
    const servicio = crear();
    const promesa = servicio.iniciarSesion('secretaria', 'Clave1234', true);
    http.expectOne(`${url}/iniciar-sesion`).flush(sesion(new Date(Date.now() + 3_600_000)));
    await promesa;

    expect(localStorage.length).toBe(1);
    servicio.cerrar();
    expect(servicio.activa()).toBeFalse();
    expect(localStorage.length).toBe(0);
  });

  it('descarta una sesión guardada que ya venció', () => {
    sessionStorage.setItem('jv-sesion-admin', JSON.stringify(sesion(new Date(Date.now() - 1000))));
    expect(crear().activa()).toBeFalse();
  });

  it('envía la clave de administración solo en la configuración inicial', async () => {
    const servicio = crear();
    const promesa = servicio.configurar(
      { nombreUsuario: 'rectoria', nombreCompleto: 'Rectoría', correo: null, clave: 'Clave1234' },
      ' clave-del-servidor ',
    );
    const peticion = http.expectOne(`${url}/configuracion-inicial`);
    expect(peticion.request.headers.get(ENCABEZADO_CLAVE_ADMIN)).toBe('clave-del-servidor');
    peticion.flush(sesion(new Date(Date.now() + 3_600_000)));
    await promesa;
    expect(servicio.activa()).toBeTrue();
  });
});

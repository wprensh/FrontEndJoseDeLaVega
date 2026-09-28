import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/api.models';
import { Noticia } from '../models/noticia.model';
import { NoticiasService } from './noticias.service';

describe('NoticiasService', () => {
  let servicio: NoticiasService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/noticias`;

  const noticia: Noticia = {
    id: '1',
    titulo: 'Semana de la Cultura',
    resumen: 'Exposición artística',
    contenido: '',
    categoria: 'Cultural',
    imagenUrl: null,
    fechaPublicacion: '2026-09-21',
    publicada: true,
    creadoEn: '2026-09-21T10:00:00Z',
    modificadoEn: null,
  };

  const pagina: PagedResult<Noticia> = { items: [noticia], pagina: 1, tamanoPagina: 10, total: 1, totalPaginas: 1 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(NoticiasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cargar() actualiza los signals con la página recibida', async () => {
    const promesa = servicio.cargar({ buscar: 'cultura', pagina: 1 });
    expect(servicio.cargando()).toBeTrue();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('buscar')).toBe('cultura');
    expect(req.request.params.has('categoria')).toBeFalse();
    req.flush(pagina);
    await promesa;

    expect(servicio.noticias()).toEqual([noticia]);
    expect(servicio.total()).toBe(1);
    expect(servicio.cargando()).toBeFalse();
    expect(servicio.error()).toBeNull();
  });

  it('cargar() expone un mensaje legible cuando la API falla', async () => {
    const promesa = servicio.cargar();
    http.expectOne((r) => r.url === url).flush(null, { status: 0, statusText: 'Unknown Error' });
    await promesa;

    expect(servicio.error()).toContain('No fue posible conectar');
    expect(servicio.cargando()).toBeFalse();
  });

  it('eliminar() quita la noticia del estado local', async () => {
    const carga = servicio.cargar();
    http.expectOne((r) => r.url === url).flush(pagina);
    await carga;

    const eliminacion = servicio.eliminar('1');
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await eliminacion;

    expect(servicio.noticias()).toEqual([]);
    expect(servicio.total()).toBe(0);
  });
});

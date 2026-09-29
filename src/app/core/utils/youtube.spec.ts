import { analizarYoutube, urlMiniaturaYoutube, urlReproductorYoutube } from './youtube';

describe('analizarYoutube', () => {
  it('reconoce un Short con parámetros de seguimiento', () => {
    expect(analizarYoutube('https://youtube.com/shorts/ILmomuQ9Zlk?si=wffViYA09SF_tlTE')).toEqual({
      id: 'ILmomuQ9Zlk',
      vertical: true,
    });
  });

  it('reconoce enlaces watch, youtu.be, embed y móviles como videos horizontales', () => {
    for (const enlace of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(analizarYoutube(enlace)).withContext(enlace).toEqual({ id: 'dQw4w9WgXcQ', vertical: false });
    }
  });

  it('devuelve null para imágenes, otros sitios, ids inválidos y texto que no es URL', () => {
    for (const enlace of [
      '/img/noticias/semana-gastronomica.png',
      'https://res.cloudinary.com/demo/image/upload/foto.png',
      'https://www.youtube.com/watch?v=corto',
      'https://www.youtube.com/@canal',
      'https://evil.com/shorts/ILmomuQ9Zlk',
      'no es una url',
      '',
      null,
    ]) {
      expect(analizarYoutube(enlace)).withContext(String(enlace)).toBeNull();
    }
  });

  it('arma la URL del reproductor sin cookies, con y sin reproducción automática', () => {
    const video = { id: 'ILmomuQ9Zlk', vertical: true };
    expect(urlReproductorYoutube(video)).toBe('https://www.youtube-nocookie.com/embed/ILmomuQ9Zlk?rel=0&playsinline=1');
    expect(urlReproductorYoutube(video, { autoplay: true })).toBe(
      'https://www.youtube-nocookie.com/embed/ILmomuQ9Zlk?rel=0&playsinline=1&autoplay=1',
    );
  });

  it('arma la URL de la miniatura', () => {
    expect(urlMiniaturaYoutube({ id: 'ILmomuQ9Zlk', vertical: true })).toBe('https://i.ytimg.com/vi/ILmomuQ9Zlk/hqdefault.jpg');
  });
});

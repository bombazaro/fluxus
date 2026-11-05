import { LARGURA_MAXIMA, tamanhoDaTela } from '@/src/domain/tamanhoDaTela';

describe('tamanhoDaTela', () => {
  it.each([
    [599, 'compacto'],
    [600, 'medio'],
    [1023, 'medio'],
    [1024, 'largo'],
    [0, 'compacto'],
    [-10, 'compacto'],
    [NaN, 'compacto'],
  ])('largura %p vira %s', (largura, esperado) => {
    expect(tamanhoDaTela(largura)).toBe(esperado);
  });

  it('tem uma largura máxima por tamanho', () => {
    expect(LARGURA_MAXIMA).toEqual({ compacto: 480, medio: 720, largo: 1100 });
  });
});

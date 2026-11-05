function carregar(os: 'web' | 'android') {
  let modulo!: typeof import('@/src/utils/aparelho');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.replaceProperty(require('react-native').Platform, 'OS', os);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('@/src/utils/aparelho');
  });
  return modulo;
}

describe('textos do aparelho', () => {
  afterEach(() => jest.restoreAllMocks());

  it('na web fala em navegador, com a preposição certa', () => {
    const t = carregar('web');
    expect(`seus dados ficam só ${t.NESTE_APARELHO}`).toBe('seus dados ficam só neste navegador');
    expect(`guarde fora ${t.DO_APARELHO}`).toBe('guarde fora do navegador');
    expect(`dados atuais ${t.DESTE_APARELHO}`).toBe('dados atuais deste navegador');
    expect(t.TEMA_DO_SISTEMA).toBe('Do sistema');
  });

  it('no celular fala em celular', () => {
    const t = carregar('android');
    expect(t.NESTE_APARELHO).toBe('neste celular');
    expect(t.DO_APARELHO).toBe('do celular');
    expect(t.DESTE_APARELHO).toBe('deste celular');
    expect(t.TEMA_DO_SISTEMA).toBe('Do celular');
  });
});

function carregar(os: 'web' | 'android') {
  let modulo!: typeof import('@/src/utils/layout');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.replaceProperty(require('react-native').Platform, 'OS', os);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('@/src/utils/layout');
  });
  return modulo;
}

describe('estilos de largura', () => {
  afterEach(() => jest.restoreAllMocks());

  it('no celular e no tablet nativo não limitam a largura', () => {
    const l = carregar('android');
    expect(l.estiloFormulario).toEqual({});
    expect(l.estiloGrafico).toEqual({});
    expect(l.estiloJanela).toEqual({});
  });

  it('na web limitam e centralizam', () => {
    const l = carregar('web');
    expect(l.estiloFormulario).toMatchObject({ maxWidth: 560, alignSelf: 'center' });
    expect(l.estiloGrafico).toMatchObject({ maxWidth: 720, alignSelf: 'center' });
    expect(l.estiloJanela).toMatchObject({ maxWidth: 440, alignSelf: 'center' });
  });
});

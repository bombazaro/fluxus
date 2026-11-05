import { entregarArquivo, escolherArquivoTexto } from '@/src/services/arquivos.web';

describe('arquivos na web', () => {
  const original = { document: globalThis.document, URL: globalThis.URL };

  beforeEach(() => jest.useFakeTimers());

  afterEach(() => {
    jest.useRealTimers();
    Object.assign(globalThis, original);
  });

  it('entregarArquivo baixa o conteúdo com o nome dado', async () => {
    const link: Record<string, unknown> = { click: jest.fn(), remove: jest.fn() };
    const anexados: unknown[] = [];
    Object.assign(globalThis, {
      document: {
        createElement: jest.fn(() => link),
        body: { appendChild: (e: unknown) => anexados.push(e) },
      },
    });
    const urlFalsa = { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() };
    Object.assign(globalThis.URL, urlFalsa);

    await entregarArquivo('fluxus.json', '{"a":1}');

    expect(link.download).toBe('fluxus.json');
    expect(link.href).toBe('blob:x');
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(anexados).toContain(link);
    // o endereço só é liberado depois, senão o Safari baixa um arquivo vazio
    expect(urlFalsa.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60_000);
    expect(urlFalsa.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('escolherArquivoTexto devolve o texto do arquivo escolhido', async () => {
    const entrada: Record<string, unknown> = { click: jest.fn(), remove: jest.fn() };
    Object.assign(globalThis, { document: { createElement: jest.fn(() => entrada) } });

    const promessa = escolherArquivoTexto();
    // simula a escolha de um arquivo
    entrada.files = [{ text: async () => '{"ok":true}' }];
    (entrada.onchange as () => void)();
    expect(await promessa).toBe('{"ok":true}');
    expect(entrada.type).toBe('file');
    expect(entrada.click).toHaveBeenCalledTimes(1);
  });

  it('escolherArquivoTexto devolve null ao cancelar', async () => {
    const entrada: Record<string, unknown> = { click: jest.fn(), remove: jest.fn() };
    Object.assign(globalThis, { document: { createElement: jest.fn(() => entrada) } });

    const promessa = escolherArquivoTexto();
    (entrada.oncancel as () => void)();
    expect(await promessa).toBeNull();
  });

  it('escolherArquivoTexto devolve null se não conseguir ler o arquivo', async () => {
    const entrada: Record<string, unknown> = { click: jest.fn(), remove: jest.fn() };
    Object.assign(globalThis, { document: { createElement: jest.fn(() => entrada) } });

    const promessa = escolherArquivoTexto();
    entrada.files = [{ text: async () => Promise.reject(new Error('sem permissão')) }];
    (entrada.onchange as () => void)();
    expect(await promessa).toBeNull();
  });
});

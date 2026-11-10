import { liberarWorkersAoSair } from '@/src/services/liberarWorkersAoSair';

class WorkerFalso {
  static criados: WorkerFalso[] = [];
  terminado = false;
  constructor(public url: string) {
    WorkerFalso.criados.push(this);
  }
  terminate() {
    this.terminado = true;
  }
}

function janelaFalsa() {
  const ouvintes: Record<string, () => void> = {};
  return {
    Worker: WorkerFalso as unknown as typeof Worker,
    addEventListener: (tipo: string, fn: () => void) => {
      ouvintes[tipo] = fn;
    },
    disparar: (tipo: string) => ouvintes[tipo]?.(),
  };
}

describe('liberarWorkersAoSair', () => {
  beforeEach(() => {
    WorkerFalso.criados = [];
  });

  it('encerra os workers criados quando a página é fechada', () => {
    const janela = janelaFalsa();
    liberarWorkersAoSair(janela);
    new janela.Worker('a.js');
    new janela.Worker('b.js');
    janela.disparar('pagehide');
    expect(WorkerFalso.criados).toHaveLength(2);
    expect(WorkerFalso.criados.every((w) => w.terminado)).toBe(true);
  });

  it('continua criando workers normalmente (mesmos argumentos)', () => {
    const janela = janelaFalsa();
    liberarWorkersAoSair(janela);
    new janela.Worker('x.js');
    expect(WorkerFalso.criados[0].url).toBe('x.js');
    expect(WorkerFalso.criados[0].terminado).toBe(false);
  });

  it('não quebra onde não existe Worker', () => {
    expect(() =>
      liberarWorkersAoSair({ Worker: undefined as never, addEventListener: () => {} })
    ).not.toThrow();
  });
});

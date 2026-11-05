import { criarAgendador } from '../src/services/sync/agendador';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const folga = () => jest.advanceTimersByTimeAsync(0);

describe('agendador de sincronização', () => {
  it('roda uma vez ao iniciar', async () => {
    const rodar = jest.fn().mockResolvedValue(undefined);
    const a = criarAgendador({ rodar, temPendencia: async () => false });
    a.iniciar();
    await folga();
    expect(rodar).toHaveBeenCalledTimes(1);
    a.parar();
  });

  it('roda quando aparece mudança pendente, e não roda se não há nada', async () => {
    const rodar = jest.fn().mockResolvedValue(undefined);
    let pendente = false;
    const a = criarAgendador({ rodar, temPendencia: async () => pendente });
    a.iniciar();
    await folga();
    await jest.advanceTimersByTimeAsync(3000);
    expect(rodar).toHaveBeenCalledTimes(1);
    pendente = true;
    await jest.advanceTimersByTimeAsync(3000);
    expect(rodar).toHaveBeenCalledTimes(2);
    a.parar();
  });

  it('roda sozinho a cada 60 s mesmo sem mudanças', async () => {
    const rodar = jest.fn().mockResolvedValue(undefined);
    const a = criarAgendador({ rodar, temPendencia: async () => false });
    a.iniciar();
    await jest.advanceTimersByTimeAsync(60000);
    expect(rodar).toHaveBeenCalledTimes(2);
    a.parar();
  });

  it('nunca roda duas ao mesmo tempo; pedido durante a rodada gera uma nova depois', async () => {
    let emAndamento = 0;
    let maximo = 0;
    let liberar: () => void = () => {};
    const rodar = jest.fn(async () => {
      emAndamento += 1;
      maximo = Math.max(maximo, emAndamento);
      await new Promise<void>((r) => (liberar = r));
      emAndamento -= 1;
    });
    const a = criarAgendador({ rodar, temPendencia: async () => false });
    a.iniciar();
    a.pedir();
    a.pedir();
    await folga();
    expect(rodar).toHaveBeenCalledTimes(1);
    liberar();
    await folga();
    expect(rodar).toHaveBeenCalledTimes(2);
    liberar();
    await folga();
    expect(maximo).toBe(1);
    a.parar();
  });

  it('erro numa rodada não derruba o agendador', async () => {
    const rodar = jest
      .fn()
      .mockRejectedValueOnce(new Error('sem rede'))
      .mockResolvedValue(undefined);
    const a = criarAgendador({ rodar, temPendencia: async () => false });
    a.iniciar();
    await folga();
    await jest.advanceTimersByTimeAsync(60000);
    expect(rodar).toHaveBeenCalledTimes(2);
    a.parar();
  });

  it('depois de parar, não roda mais', async () => {
    const rodar = jest.fn().mockResolvedValue(undefined);
    const a = criarAgendador({ rodar, temPendencia: async () => true });
    a.iniciar();
    await folga();
    a.parar();
    await jest.advanceTimersByTimeAsync(120000);
    a.pedir();
    await folga();
    expect(rodar).toHaveBeenCalledTimes(1);
  });
});

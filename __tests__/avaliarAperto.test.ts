import { avaliarAperto } from '../src/domain/avaliarAperto';

describe('avaliarAperto', () => {
  it('retorna normal quando gastos estão abaixo de 80%', () => {
    // 500 / 1000 = 50%
    const res = avaliarAperto(50000, 100000);
    expect(res.nivel).toBe('normal');
  });

  it('retorna atencao quando gastos atingem entre 80% e 100%', () => {
    // 850 / 1000 = 85%
    const res = avaliarAperto(85000, 100000);
    expect(res.nivel).toBe('atencao');
    expect(res.mensagem).toContain('85%');
  });

  it('retorna aperto quando gastos ultrapassam a renda', () => {
    // 1200 / 1000 = 120%
    const res = avaliarAperto(120000, 100000);
    expect(res.nivel).toBe('aperto');
    expect(res.mensagem).toContain('Faltam');
  });

  it('retorna critico quando não há renda e há contas', () => {
    const res = avaliarAperto(10000, 0);
    expect(res.nivel).toBe('critico');
  });

  it('respeita limites customizados de configuração', () => {
    // Limite de atenção em 70%
    const res = avaliarAperto(75000, 100000, {
      limiteAtencaoPercentual: 70,
    });
    expect(res.nivel).toBe('atencao');
  });
});

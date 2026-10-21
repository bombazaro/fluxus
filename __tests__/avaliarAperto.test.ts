import { avaliarAperto } from '../src/domain/avaliarAperto';
import { formatarMoeda } from '../src/utils/formatadores';

describe('avaliarAperto', () => {
  it('retorna normal quando gastos estão abaixo de 80%', () => {
    // 500 / 1000 = 50%
    const res = avaliarAperto({ totalContasCentavos: 50000, rendaTotalCentavos: 100000 });
    expect(res.nivel).toBe('normal');
  });

  it('retorna normal sem contas, mesmo sem renda', () => {
    const res = avaliarAperto({ totalContasCentavos: 0, rendaTotalCentavos: 0 });
    expect(res.nivel).toBe('normal');
  });

  it('retorna atencao quando gastos atingem entre 80% e 100%', () => {
    // 850 / 1000 = 85%
    const res = avaliarAperto({ totalContasCentavos: 85000, rendaTotalCentavos: 100000 });
    expect(res.nivel).toBe('atencao');
    expect(res.mensagem).toContain('85%');
  });

  it('retorna aperto quando gastos ultrapassam a renda, com quanto falta', () => {
    // 1200 / 1000 = 120%
    const res = avaliarAperto({ totalContasCentavos: 120000, rendaTotalCentavos: 100000 });
    expect(res.nivel).toBe('aperto');
    expect(res.mensagem).toBe(`Faltam ${formatarMoeda(20000)} para fechar o mês`);
  });

  it('retorna aperto quando há contas e nenhuma renda', () => {
    const res = avaliarAperto({ totalContasCentavos: 10000, rendaTotalCentavos: 0 });
    expect(res.nivel).toBe('aperto');
    expect(res.mensagem).toContain(formatarMoeda(10000));
  });

  it('a sobra do mês anterior ajuda a fechar o mês', () => {
    const res = avaliarAperto({
      totalContasCentavos: 120000,
      rendaTotalCentavos: 100000,
      saldoInicialCentavos: 50000,
    });
    // 1200 de 1500 = 80%
    expect(res.nivel).toBe('atencao');
  });

  it('retorna critico quando o mês fecha, mas o saldo fica negativo antes da renda cair', () => {
    const res = avaliarAperto({
      totalContasCentavos: 50000,
      rendaTotalCentavos: 100000,
      menorSaldo: { valorCentavos: -50000, dia: 10 },
    });
    expect(res.nivel).toBe('critico');
    expect(res.mensagem).toBe(
      `No dia 10 faltam ${formatarMoeda(50000)}: as contas vencem antes de a renda cair`
    );
  });

  it('aperto tem prioridade sobre critico (o mês nem fecha)', () => {
    const res = avaliarAperto({
      totalContasCentavos: 150000,
      rendaTotalCentavos: 100000,
      menorSaldo: { valorCentavos: -150000, dia: 10 },
    });
    expect(res.nivel).toBe('aperto');
  });

  it('respeita limites customizados de configuração', () => {
    // Limite de atenção em 70%
    const res = avaliarAperto({
      totalContasCentavos: 75000,
      rendaTotalCentavos: 100000,
      limiteAtencaoPercentual: 70,
    });
    expect(res.nivel).toBe('atencao');
  });
});

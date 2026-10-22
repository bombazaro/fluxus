import { calcularSaldoPorDia } from '../src/domain/saldoPorDia';
import { LancamentoComDetalhes, Renda } from '../src/types';

describe('calcularSaldoPorDia', () => {
  it('detecta aperto quando contas vencem antes do salário cair', () => {
    // Aluguel R$ 1.500 no dia 05
    const lancamentos: LancamentoComDetalhes[] = [
      {
        id: 1,
        conta_id: 1,
        mes_ref: '2026-05',
        vencimento: '2026-05-05',
        valor_centavos: 150000,
        pago: 0,
        pago_em: null,
        parcela_numero: null,
        conta_nome: 'Aluguel',
        conta_tipo: 'fixa',
        categoria_id: 1,
        categoria_nome: 'Moradia',
        categoria_cor: '#0F766E',
        categoria_icone: 'home',
        compartilhada: 0,
        sem_vencimento: 0,
        parcelas_total: null,
      },
    ];

    // Salário R$ 3.000 cai no dia 10
    const rendas: Renda[] = [
      {
        id: 1,
        nome: 'Salário',
        valor_centavos: 300000,
        dia_recebimento: 10,
        tipo: 'fixa',
        mes_ref: null,
        ativa: 1,
        criado_em: '2026-01-01',
      },
    ];

    const res = calcularSaldoPorDia('2026-05', lancamentos, rendas);

    // No dia 05 até dia 09 o saldo é -150000
    expect(res.menorSaldoCentavos).toBe(-150000);
    expect(res.diaMenorSaldo).toBe(5);
    expect(res.saldoFinalCentavos).toBe(150000);
    expect(res.mensagemAperto).toContain('saldo fica negativo');
  });

  it('calcula mês com dias corretos em fevereiro de 2026 (28 dias)', () => {
    const res = calcularSaldoPorDia('2026-02', [], []);
    expect(res.pontos).toHaveLength(28);
    expect(res.menorSaldoCentavos).toBe(0);
  });

  it('com a sobra do mês anterior, salário no dia 30 cobre contas do dia 10', () => {
    const conta = {
      id: 1,
      conta_id: 1,
      mes_ref: '2026-11',
      vencimento: '2026-11-10',
      valor_centavos: 100000,
      pago: 0,
      pago_em: null,
      parcela_numero: null,
      conta_nome: 'Aluguel',
      conta_tipo: 'fixa',
      categoria_id: 1,
      categoria_nome: 'Moradia',
      categoria_cor: '#000',
      categoria_icone: 'home',
      compartilhada: 0,
      sem_vencimento: 0,
      parcelas_total: null,
    } as LancamentoComDetalhes;
    const salario: Renda = {
      id: 1,
      nome: 'Salário',
      valor_centavos: 300000,
      dia_recebimento: 30,
      tipo: 'fixa',
      mes_ref: null,
      ativa: 1,
      criado_em: '2026-10-01',
    };

    const semSobra = calcularSaldoPorDia('2026-11', [conta], [salario]);
    expect(semSobra.menorSaldoCentavos).toBe(-100000);

    // Outubro sobrou R$ 3.000 (o salário do dia 30 de outubro)
    const comSobra = calcularSaldoPorDia('2026-11', [conta], [salario], 300000);
    expect(comSobra.menorSaldoCentavos).toBe(200000);
  });
});

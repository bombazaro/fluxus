import { resumoDoMes } from '../src/domain/resumoDoMes';
import { LancamentoComDetalhes, Renda } from '../src/types';

describe('marcar conta como paga', () => {
  it('atualiza totalPago e faltaPagar ao marcar e desmarcar', () => {
    const rendas: Renda[] = [
      {
        id: 1,
        nome: 'Salário',
        valor_centavos: 300000,
        dia_recebimento: 5,
        tipo: 'fixa',
        mes_ref: null,
        ativa: 1,
        criado_em: '2026-01-01',
      },
    ];

    const lancamento1: LancamentoComDetalhes = {
      id: 1,
      conta_id: 10,
      mes_ref: '2026-05',
      vencimento: '2026-05-10',
      valor_centavos: 10000,
      pago: 0,
      pago_em: null,
      parcela_numero: null,
      conta_nome: 'Internet',
      conta_tipo: 'fixa',
      categoria_id: 1,
      categoria_nome: 'Moradia',
      categoria_cor: '#0F766E',
      categoria_icone: 'home',
      compartilhada: 0,
      sem_vencimento: 0,
      parcelas_total: null,
    };

    // Pendente
    const antes = resumoDoMes([lancamento1], rendas);
    expect(antes.totalPago).toBe(0);
    expect(antes.faltaPagar).toBe(10000);
    expect(antes.sobraAtual).toBe(300000);

    // Marcada como paga
    const pago1 = { ...lancamento1, pago: 1 as const, pago_em: '2026-05-10T10:00:00Z' };
    const depois = resumoDoMes([pago1], rendas);
    expect(depois.totalPago).toBe(10000);
    expect(depois.faltaPagar).toBe(0);
    expect(depois.sobraAtual).toBe(290000);
  });
});

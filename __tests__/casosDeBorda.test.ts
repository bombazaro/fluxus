import { dividirContaPorIgual } from '../src/domain/dividirConta';
import { gerarLancamentosParaConta, sugerirMesInicio } from '../src/domain/gerarLancamentos';
import { MesPrevisto } from '../src/domain/preverSaldo';
import { simularImpacto, simularParcelas } from '../src/domain/simularParcelas';
import { Conta } from '../src/types';

function conta(extra: Partial<Conta> = {}): Omit<Conta, 'id' | 'criado_em'> {
  return {
    nome: 'Celular',
    categoria_id: 1,
    tipo: 'parcelada',
    valor_centavos: 20000,
    dia_vencimento: 30,
    data_unica: null,
    parcelas_total: 4,
    data_inicio: '2026-11-30',
    data_fim: null,
    ativa: 1,
    compartilhada: 0,
    sem_vencimento: 0,
    ...extra,
  };
}

describe('datas nas viradas de mês e de ano', () => {
  it('parcelas do dia 30 atravessam o ano e caem no dia 28 em fevereiro', () => {
    const vencimentos = gerarLancamentosParaConta(conta()).map((l) => l.vencimento);
    expect(vencimentos).toEqual(['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']);
  });

  it('parcela única gera só uma parcela', () => {
    const lancamentos = gerarLancamentosParaConta(conta({ parcelas_total: 1 }));
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0].parcela_numero).toBe(1);
  });

  it('conta cadastrada no fim de dezembro com vencimento já passado começa em janeiro', () => {
    expect(sugerirMesInicio('2026-12', 10, '2026-12-31')).toBe('2027-01');
  });

  it('em fevereiro, o vencimento 30 vira dia 28 e ainda não passou no dia 28', () => {
    expect(sugerirMesInicio('2027-02', 30, '2027-02-28')).toBe('2027-02');
  });
});

describe('valores no limite', () => {
  it('divisão por igual de poucos centavos ainda soma o total', () => {
    expect(dividirContaPorIgual(1, 3)).toEqual([1, 0, 0]);
    expect(dividirContaPorIgual(0, 2)).toEqual([0, 0]);
  });

  it('simulação com parcelas zero ou valor zero não quebra', () => {
    expect(simularParcelas(10000, 0, 0).parcelaCentavos).toBe(10000);
    expect(simularParcelas(0, 3, 2)).toEqual({ parcelaCentavos: 0, totalCentavos: 0, jurosCentavos: 0 });
  });

  it('sem renda, qualquer compra não cabe', () => {
    const base: MesPrevisto[] = [
      { mesRef: '2026-11', rendaCentavos: 0, contasCentavos: 0, sobraCentavos: 0 },
    ];
    expect(simularImpacto(base, 100, '2026-11', 1).veredito).toBe('nao_cabe');
  });

  it('compra que começa depois da previsão não tem pior mês e cabe com folga', () => {
    const base: MesPrevisto[] = [
      { mesRef: '2026-11', rendaCentavos: 300000, contasCentavos: 0, sobraCentavos: 300000 },
    ];
    const impacto = simularImpacto(base, 100, '2027-06', 2);
    expect(impacto.piorMes).toBeNull();
    expect(impacto.veredito).toBe('folga');
  });
});

import { resumoDoMes } from '../src/domain/resumoDoMes';
import { LancamentoComDetalhes, Renda } from '../src/types';

describe('resumoDoMes', () => {
  const criarLancamento = (
    id: number,
    valorCentavos: number,
    pago: 0 | 1,
    extra?: Partial<LancamentoComDetalhes>
  ): LancamentoComDetalhes => ({
    id,
    conta_id: id,
    mes_ref: '2026-05',
    vencimento: '2026-05-10',
    valor_centavos: valorCentavos,
    pago,
    pago_em: pago ? '2026-05-10T10:00:00Z' : null,
    parcela_numero: null,
    conta_nome: `Conta ${id}`,
    conta_tipo: 'fixa',
    categoria_id: 1,
    categoria_nome: 'Moradia',
    categoria_cor: '#0F766E',
    categoria_icone: 'home',
    compartilhada: 0,
    parcelas_total: null,
    ...extra,
  });

  const criarRenda = (
    id: number,
    valorCentavos: number,
    ativa: 0 | 1 = 1
  ): Renda => ({
    id,
    nome: `Renda ${id}`,
    valor_centavos: valorCentavos,
    dia_recebimento: 5,
    tipo: 'fixa',
    ativa,
    criado_em: '2026-01-01',
  });

  it('calcula corretamente com lista vazia', () => {
    const resumo = resumoDoMes([], []);
    expect(resumo).toEqual({
      totalContas: 0,
      totalPago: 0,
      faltaPagar: 0,
      rendaTotal: 0,
      sobra: 0,
      sobraAtual: 0,
      percentualUsado: 0,
    });
  });

  it('calcula mês com contas pendentes e pagas', () => {
    const lancamentos = [
      criarLancamento(1, 10000, 1), // R$ 100 pago
      criarLancamento(2, 5000, 0),  // R$ 50 pendente
      criarLancamento(3, 2550, 0),  // R$ 25,50 pendente
    ];
    const rendas = [criarRenda(1, 30000)]; // R$ 300 renda

    const resumo = resumoDoMes(lancamentos, rendas);

    expect(resumo.totalContas).toBe(17550); // R$ 175,50
    expect(resumo.totalPago).toBe(10000);   // R$ 100,00
    expect(resumo.faltaPagar).toBe(7550);   // R$ 75,50
    expect(resumo.rendaTotal).toBe(30000);  // R$ 300,00
    expect(resumo.sobra).toBe(12450);       // 30000 - 17550 = R$ 124,50
    expect(resumo.sobraAtual).toBe(20000);  // 30000 - 10000 = R$ 200,00
    expect(resumo.percentualUsado).toBeCloseTo(17550 / 30000);
  });

  it('ignora rendas inativas', () => {
    const lancamentos = [criarLancamento(1, 10000, 0)];
    const rendas = [
      criarRenda(1, 20000, 1), // R$ 200 ativa
      criarRenda(2, 50000, 0), // R$ 500 inativa
    ];

    const resumo = resumoDoMes(lancamentos, rendas);
    expect(resumo.rendaTotal).toBe(20000);
    expect(resumo.sobra).toBe(10000);
  });

  it('evita divisão por zero quando renda é zero', () => {
    const lancamentos = [criarLancamento(1, 10000, 0)];
    const resumo = resumoDoMes(lancamentos, []);

    expect(resumo.rendaTotal).toBe(0);
    expect(resumo.sobra).toBe(-10000);
    expect(resumo.percentualUsado).toBe(1);
    expect(Number.isNaN(resumo.percentualUsado)).toBe(false);
  });

  it('calcula percentual quando contas ultrapassam a renda', () => {
    const lancamentos = [criarLancamento(1, 15000, 0)];
    const rendas = [criarRenda(1, 10000)];

    const resumo = resumoDoMes(lancamentos, rendas);
    expect(resumo.sobra).toBe(-5000);
    expect(resumo.percentualUsado).toBe(1.5);
  });

  it('considera apenas a parte do usuário em contas compartilhadas quando solicitado', () => {
    const lancamentos = [
      criarLancamento(1, 20000, 0, {
        compartilhada: 1,
        minha_parte_centavos: 10000, // metade
      }),
      criarLancamento(2, 5000, 0), // normal
    ];
    const rendas = [criarRenda(1, 30000)];

    // Com considerarApenasMinhaParte: true (padrão)
    const resumoParte = resumoDoMes(lancamentos, rendas, {
      considerarApenasMinhaParte: true,
    });
    expect(resumoParte.totalContas).toBe(15000); // 10000 + 5000

    // Com considerarApenasMinhaParte: false
    const resumoTotal = resumoDoMes(lancamentos, rendas, {
      considerarApenasMinhaParte: false,
    });
    expect(resumoTotal.totalContas).toBe(25000); // 20000 + 5000
  });
});

import { montarCalendario } from '../src/domain/montarCalendario';
import { LancamentoComDetalhes, Renda } from '../src/types';

describe('montarCalendario', () => {
  const criarLancamento = (
    id: number,
    vencimento: string,
    pago: 0 | 1,
    valorCentavos = 10000
  ): LancamentoComDetalhes => ({
    id,
    conta_id: id,
    mes_ref: vencimento.slice(0, 7),
    vencimento,
    valor_centavos: valorCentavos,
    pago,
    pago_em: null,
    parcela_numero: null,
    conta_nome: `Conta ${id}`,
    conta_tipo: 'fixa',
    categoria_id: 1,
    categoria_nome: 'Moradia',
    categoria_cor: '#0F766E',
    categoria_icone: 'home',
    compartilhada: 0,
    parcelas_total: null,
  });

  const salario: Renda = {
    id: 1,
    nome: 'Salário',
    valor_centavos: 300000,
    dia_recebimento: 31,
    tipo: 'fixa',
    mes_ref: null,
    ativa: 1,
    criado_em: '2026-01-01',
  };

  it('fevereiro de 2026 começa no domingo e ocupa 4 semanas exatas', () => {
    const semanas = montarCalendario('2026-02', [], [], '2026-02-10');

    expect(semanas).toHaveLength(4);
    expect(semanas[0][0]?.dia).toBe(1);
    expect(semanas[3][6]?.dia).toBe(28);
  });

  it('deixa espaços vazios antes do dia 1 e depois do último dia', () => {
    // 1º de outubro de 2026 é uma quinta-feira
    const semanas = montarCalendario('2026-10', [], [], '2026-10-20');

    expect(semanas[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(semanas[0][4]?.dia).toBe(1);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[semanas.length - 1].filter((d) => d === null)).toHaveLength(
      semanas.flat().length - 31 - 4
    );
  });

  it('marca atrasada, pendente e paga pelos lançamentos e soma o total do dia', () => {
    const semanas = montarCalendario(
      '2026-10',
      [
        criarLancamento(1, '2026-10-05', 0, 5000),
        criarLancamento(2, '2026-10-05', 1, 2500),
        criarLancamento(3, '2026-10-25', 0),
      ],
      [],
      '2026-10-20'
    );
    const dias = semanas.flat();
    const dia5 = dias.find((d) => d?.dia === 5);
    const dia25 = dias.find((d) => d?.dia === 25);

    expect(dia5?.marcas).toEqual(['atrasada', 'paga']);
    expect(dia5?.totalContasCentavos).toBe(7500);
    expect(dia25?.marcas).toEqual(['pendente']);
  });

  it('marca a renda no último dia quando o mês é mais curto', () => {
    const semanas = montarCalendario('2026-02', [], [salario], '2026-02-10');
    const dia28 = semanas.flat().find((d) => d?.dia === 28);

    expect(dia28?.marcas).toEqual(['renda']);
  });

  it('destaca o dia de hoje', () => {
    const semanas = montarCalendario('2026-10', [], [], '2026-10-20');
    const hoje = semanas.flat().filter((d) => d?.ehHoje);

    expect(hoje).toHaveLength(1);
    expect(hoje[0]?.dia).toBe(20);
  });
});

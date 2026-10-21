import { DadosPrevisao, fimDosParcelamentos, preverSaldo } from '../src/domain/preverSaldo';
import { Conta, Renda } from '../src/types';

function conta(extra: Partial<Conta> = {}): Conta {
  return {
    id: 1,
    nome: 'Internet',
    categoria_id: 1,
    tipo: 'fixa',
    valor_centavos: 10000,
    dia_vencimento: 10,
    data_unica: null,
    parcelas_total: null,
    data_inicio: '2026-01-10',
    data_fim: null,
    ativa: 1,
    compartilhada: 0,
    sem_vencimento: 0,
    criado_em: '2026-01-01',
    ...extra,
  };
}

const SALARIO: Renda = {
  id: 1,
  nome: 'Salário',
  valor_centavos: 300000,
  dia_recebimento: 30,
  tipo: 'fixa',
  mes_ref: null,
  ativa: 1,
  criado_em: '2026-01-01',
};

function dados(extra: Partial<DadosPrevisao> = {}): DadosPrevisao {
  return {
    contas: [],
    lancamentos: [],
    ignorados: [],
    rendas: [SALARIO],
    recebidas: [],
    mediaVariaveis: {},
    fracaoMinhaParte: {},
    ...extra,
  };
}

describe('preverSaldo', () => {
  it('projeta a conta fixa e a renda em cada mês', () => {
    const meses = preverSaldo(dados({ contas: [conta()] }), '2026-11', 3);
    expect(meses.map((m) => m.mesRef)).toEqual(['2026-11', '2026-12', '2027-01']);
    for (const m of meses) {
      expect(m).toMatchObject({ rendaCentavos: 300000, contasCentavos: 10000, sobraCentavos: 290000 });
    }
  });

  it('usa o lançamento que já existe em vez de projetar de novo', () => {
    const meses = preverSaldo(
      dados({
        contas: [conta()],
        lancamentos: [{ id: 1, conta_id: 1, mes_ref: '2026-11', valor_centavos: 12000 }],
      }),
      '2026-11',
      2
    );
    expect(meses.map((m) => m.contasCentavos)).toEqual([12000, 10000]);
  });

  it('conta variável entra pela média dos últimos meses', () => {
    const meses = preverSaldo(
      dados({ contas: [conta({ tipo: 'variavel' })], mediaVariaveis: { 1: 15000 } }),
      '2026-11',
      1
    );
    expect(meses[0].contasCentavos).toBe(15000);
  });

  it('respeita o início, o fim e os meses excluídos da conta', () => {
    const meses = preverSaldo(
      dados({
        contas: [conta({ data_inicio: '2026-12-10', data_fim: '2027-01-31' })],
        ignorados: [{ conta_id: 1, mes_ref: '2027-01' }],
      }),
      '2026-11',
      4
    );
    expect(meses.map((m) => m.contasCentavos)).toEqual([0, 10000, 0, 0]);
  });

  it('parcelas e contas únicas só contam pelos lançamentos cadastrados', () => {
    const meses = preverSaldo(
      dados({
        contas: [conta({ tipo: 'parcelada', parcelas_total: 2 }), conta({ id: 2, tipo: 'unica' })],
        lancamentos: [
          { id: 1, conta_id: 1, mes_ref: '2026-11', valor_centavos: 50000 },
          { id: 2, conta_id: 1, mes_ref: '2026-12', valor_centavos: 50000 },
          { id: 3, conta_id: 2, mes_ref: '2026-12', valor_centavos: 80000 },
        ],
      }),
      '2026-11',
      3
    );
    expect(meses.map((m) => m.contasCentavos)).toEqual([50000, 130000, 0]);
  });

  it('conta compartilhada usa a minha parte', () => {
    const meses = preverSaldo(
      dados({
        contas: [conta({ compartilhada: 1, valor_centavos: 20000 })],
        lancamentos: [
          { id: 1, conta_id: 1, mes_ref: '2026-11', valor_centavos: 20000, minha_parte_centavos: 10000 },
        ],
        fracaoMinhaParte: { 1: 0.5 },
      }),
      '2026-11',
      2
    );
    expect(meses.map((m) => m.contasCentavos)).toEqual([10000, 10000]);

    const inteiro = preverSaldo(
      dados({
        contas: [conta({ compartilhada: 1, valor_centavos: 20000 })],
        fracaoMinhaParte: { 1: 0.5 },
      }),
      '2026-11',
      1,
      { contarSoMinhaParte: false }
    );
    expect(inteiro[0].contasCentavos).toBe(20000);
  });

  it('renda pontual entra só no mês dela', () => {
    const decimo: Renda = { ...SALARIO, id: 2, nome: '13º', tipo: 'pontual', mes_ref: '2026-12' };
    const meses = preverSaldo(dados({ rendas: [SALARIO, decimo] }), '2026-11', 3);
    expect(meses.map((m) => m.rendaCentavos)).toEqual([300000, 600000, 300000]);
  });

  it('sobra negativa quando as contas passam da renda', () => {
    const meses = preverSaldo(
      dados({ contas: [conta({ valor_centavos: 350000 })] }),
      '2026-11',
      1
    );
    expect(meses[0].sobraCentavos).toBe(-50000);
  });
});

describe('fimDosParcelamentos', () => {
  it('lista quando cada parcelamento termina e quanto libera, do mais próximo ao mais longe', () => {
    const fim = fimDosParcelamentos(
      [
        { conta_id: 1, nome: 'Celular', ultimo_mes: '2027-03', valor_parcela_centavos: 20000, parcelas_restantes: 5 },
        { conta_id: 2, nome: 'Geladeira', ultimo_mes: '2026-12', valor_parcela_centavos: 30000, parcelas_restantes: 2 },
        { conta_id: 3, nome: 'Curso', ultimo_mes: '2026-09', valor_parcela_centavos: 10000, parcelas_restantes: 0 },
      ],
      '2026-11'
    );
    expect(fim).toEqual([
      { contaId: 2, nome: 'Geladeira', ultimoMes: '2026-12', liberaAPartirDe: '2027-01', valorCentavos: 30000, parcelasRestantes: 2 },
      { contaId: 1, nome: 'Celular', ultimoMes: '2027-03', liberaAPartirDe: '2027-04', valorCentavos: 20000, parcelasRestantes: 5 },
    ]);
  });
});

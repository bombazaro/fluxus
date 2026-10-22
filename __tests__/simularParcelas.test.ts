import { simularImpacto, simularParcelas } from '../src/domain/simularParcelas';
import { MesPrevisto } from '../src/domain/preverSaldo';

describe('simularParcelas', () => {
  it('sem juros, divide o valor pelas parcelas', () => {
    expect(simularParcelas(120000, 12, 0)).toEqual({
      parcelaCentavos: 10000,
      totalCentavos: 120000,
      jurosCentavos: 0,
    });
  });

  it('sem juros e divisão quebrada, arredonda a parcela para cima (o total cobre o valor)', () => {
    const r = simularParcelas(100000, 3, 0);
    expect(r.parcelaCentavos).toBe(33334);
    expect(r.totalCentavos).toBeGreaterThanOrEqual(100000);
  });

  it('com juros, usa a tabela Price', () => {
    // R$ 1.000 em 12x a 2% ao mês: parcela de R$ 94,56
    const r = simularParcelas(100000, 12, 2);
    expect(r.parcelaCentavos).toBe(9456);
    expect(r.totalCentavos).toBe(9456 * 12);
    expect(r.jurosCentavos).toBe(9456 * 12 - 100000);
  });

  it('parcela única é o valor à vista (mais o juro de um mês, se houver)', () => {
    expect(simularParcelas(50000, 1, 0).parcelaCentavos).toBe(50000);
    expect(simularParcelas(50000, 1, 10).parcelaCentavos).toBe(55000);
  });
});

function mes(mesRef: string, renda: number, contas: number): MesPrevisto {
  return { mesRef, rendaCentavos: renda, contasCentavos: contas, sobraCentavos: renda - contas };
}

const BASE = [
  mes('2026-11', 300000, 200000), // sobra 1000
  mes('2026-12', 300000, 280000), // sobra 200
  mes('2027-01', 300000, 100000), // sobra 2000
  mes('2027-02', 300000, 100000),
];

describe('simularImpacto', () => {
  it('desconta a parcela só nos meses da compra', () => {
    const r = simularImpacto(BASE, 10000, '2026-12', 2);
    expect(r.comCompra.map((m) => m.sobraCentavos)).toEqual([100000, 10000, 190000, 200000]);
  });

  it('aponta o pior mês com a compra', () => {
    const r = simularImpacto(BASE, 10000, '2026-11', 3);
    expect(r.piorMes).toEqual({ mesRef: '2026-12', sobraCentavos: 10000 });
  });

  it('cabe com folga quando sobra bastante em todos os meses', () => {
    expect(simularImpacto(BASE, 5000, '2027-01', 2).veredito).toBe('folga');
  });

  it('cabe, mas aperta quando a sobra cai abaixo de 10% da renda', () => {
    // Dezembro fica com 100 de sobra (renda 3000): menos de 10%
    expect(simularImpacto(BASE, 10000, '2026-12', 1).veredito).toBe('aperta');
  });

  it('não cabe quando algum mês fica negativo', () => {
    expect(simularImpacto(BASE, 30000, '2026-11', 2).veredito).toBe('nao_cabe');
  });

  it('o veredito só olha os meses da compra', () => {
    const comMesRuim = [mes('2026-11', 100000, 200000), ...BASE.slice(1)];
    expect(simularImpacto(comMesRuim, 5000, '2027-01', 2).veredito).toBe('folga');
  });
});

import { calcularReserva } from '../src/domain/calcularReserva';
import { ReservaAporte, ReservaMeta } from '../src/types';

let id = 1;
function aporte(valor: number, data: string): ReservaAporte {
  return { id: id++, valor_centavos: valor, data, observacao: null };
}

const META_FIXA: ReservaMeta = { id: 1, valor_meta_centavos: 1000000, tipo_meta: 'fixo', meses_gastos: 6 };
const HOJE = '2026-10-21';

describe('calcularReserva', () => {
  it('sem meta, só soma o guardado', () => {
    const r = calcularReserva(null, [aporte(50000, '2026-10-01')], 300000, HOJE);
    expect(r).toMatchObject({ metaCentavos: 0, guardadoCentavos: 50000, percentual: 0, metaBatida: false });
  });

  it('soma aportes e desconta retiradas', () => {
    const r = calcularReserva(
      META_FIXA,
      [aporte(300000, '2026-09-05'), aporte(-50000, '2026-10-02')],
      0,
      HOJE
    );
    expect(r.guardadoCentavos).toBe(250000);
    expect(r.faltaCentavos).toBe(750000);
    expect(r.percentual).toBeCloseTo(0.25);
  });

  it('meta em meses de gastos usa o gasto mensal médio', () => {
    const r = calcularReserva(
      { id: 1, valor_meta_centavos: 0, tipo_meta: 'meses_gastos', meses_gastos: 6 },
      [],
      250000,
      HOJE
    );
    expect(r.metaCentavos).toBe(1500000);
  });

  it('estima em quantos meses chega pela média dos aportes dos últimos 3 meses', () => {
    // Aportes em ago, set e out: 100 + 200 + 300 = 600 em 3 meses = 200/mês
    const r = calcularReserva(
      { ...META_FIXA, valor_meta_centavos: 160000 },
      [
        aporte(10000, '2026-08-10'),
        aporte(20000, '2026-09-10'),
        aporte(30000, '2026-10-10'),
        // Antigo, fora da janela: conta no guardado, não no ritmo
        aporte(40000, '2026-01-10'),
      ],
      0,
      HOJE
    );
    expect(r.guardadoCentavos).toBe(100000);
    expect(r.ritmoMensalCentavos).toBe(20000);
    // Faltam 600 a 200/mês = 3 meses
    expect(r.mesesParaMeta).toBe(3);
  });

  it('quem começou este mês tem o ritmo do próprio mês', () => {
    const r = calcularReserva(META_FIXA, [aporte(100000, '2026-10-05')], 0, HOJE);
    expect(r.ritmoMensalCentavos).toBe(100000);
    expect(r.mesesParaMeta).toBe(9);
  });

  it('sem aportes recentes (ou só retiradas), não dá para estimar', () => {
    const r = calcularReserva(META_FIXA, [aporte(-1000, '2026-10-05')], 0, HOJE);
    expect(r.ritmoMensalCentavos).toBeNull();
    expect(r.mesesParaMeta).toBeNull();
  });

  it('meta batida', () => {
    const r = calcularReserva(META_FIXA, [aporte(1200000, '2026-10-01')], 0, HOJE);
    expect(r).toMatchObject({ metaBatida: true, faltaCentavos: 0, mesesParaMeta: 0 });
    expect(r.percentual).toBeCloseTo(1.2);
  });
});

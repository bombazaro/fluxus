import { rendasDoMes } from '../src/domain/rendasDoMes';
import { resumoDoMes } from '../src/domain/resumoDoMes';
import { Renda, RendaRecebida } from '../src/types';

describe('rendasDoMes', () => {
  const criarRenda = (id: number, extra?: Partial<Renda>): Renda => ({
    id,
    nome: `Renda ${id}`,
    valor_centavos: 300000,
    dia_recebimento: 5,
    tipo: 'fixa',
    mes_ref: null,
    ativa: 1,
    criado_em: '2026-03-10T12:00:00.000Z',
    ...extra,
  });

  const criarRecebida = (
    rendaId: number,
    mesRef: string,
    valorCentavos: number
  ): RendaRecebida => ({
    id: rendaId,
    renda_id: rendaId,
    mes_ref: mesRef,
    valor_centavos: valorCentavos,
    recebida_em: `${mesRef}-05T12:00:00.000Z`,
  });

  it('conta renda fixa a partir do mês de cadastro', () => {
    const rendas = [criarRenda(1)];
    expect(rendasDoMes(rendas, [], '2026-02')).toHaveLength(0);
    expect(rendasDoMes(rendas, [], '2026-03')).toHaveLength(1);
    expect(rendasDoMes(rendas, [], '2026-11')).toHaveLength(1);
  });

  it('conta renda pontual só no seu mês', () => {
    const rendas = [criarRenda(1, { tipo: 'pontual', mes_ref: '2026-12' })];
    expect(rendasDoMes(rendas, [], '2026-11')).toHaveLength(0);
    expect(rendasDoMes(rendas, [], '2026-12')).toHaveLength(1);
    expect(rendasDoMes(rendas, [], '2027-01')).toHaveLength(0);
  });

  it('ignora rendas inativas', () => {
    const rendas = [criarRenda(1), criarRenda(2, { ativa: 0 })];
    expect(rendasDoMes(rendas, [], '2026-05').map((r) => r.id)).toEqual([1]);
  });

  it('usa o valor recebido quando a renda variável foi marcada como recebida', () => {
    const rendas = [criarRenda(1, { tipo: 'variavel', valor_centavos: 200000 })];
    const [renda] = rendasDoMes(rendas, [criarRecebida(1, '2026-05', 187040)], '2026-05');

    expect(renda.valor_centavos).toBe(187040);
    expect(renda.valor_previsto_centavos).toBe(200000);
    expect(renda.recebida).toBe(true);
  });

  it('ignora recebimentos de outros meses', () => {
    const rendas = [criarRenda(1)];
    const [renda] = rendasDoMes(rendas, [criarRecebida(1, '2026-04', 1)], '2026-05');

    expect(renda.valor_centavos).toBe(300000);
    expect(renda.recebida).toBe(false);
  });

  it('o resumo do mês soma só as rendas do mês', () => {
    const rendas = [
      criarRenda(1, { valor_centavos: 300000 }),
      criarRenda(2, { tipo: 'pontual', mes_ref: '2026-12', valor_centavos: 150000 }),
    ];

    expect(resumoDoMes([], rendasDoMes(rendas, [], '2026-11')).rendaTotal).toBe(300000);
    expect(resumoDoMes([], rendasDoMes(rendas, [], '2026-12')).rendaTotal).toBe(450000);
  });
});

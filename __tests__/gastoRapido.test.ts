import { montarGastoRapido, EntradaGastoRapido } from '../src/domain/gastoRapido';
import { contasRepo } from '../src/db/repositorios/contasRepo';
import { lancamentosRepo } from '../src/db/repositorios/lancamentosRepo';
import { criarBanco } from './helpers/bancoEmMemoria';

const ENTRADA: EntradaGastoRapido = {
  descricao: 'Mercado',
  valorCentavos: 15990,
  categoria: { id: 2, nome: 'Alimentação' },
  dataIso: '2026-10-26',
  agoraIso: '2026-10-26T18:00:00.000Z',
};

describe('montarGastoRapido', () => {
  it('vira uma conta única já paga no dia do gasto', () => {
    const { conta, lancamento, erro } = montarGastoRapido(ENTRADA);
    expect(erro).toBeNull();
    expect(conta).toMatchObject({
      nome: 'Mercado',
      categoria_id: 2,
      tipo: 'unica',
      valor_centavos: 15990,
      data_unica: '2026-10-26',
      data_inicio: '2026-10-26',
      ativa: 1,
    });
    expect(lancamento).toEqual({
      mes_ref: '2026-10',
      vencimento: '2026-10-26',
      valor_centavos: 15990,
      pago: 1,
      pago_em: '2026-10-26T18:00:00.000Z',
      parcela_numero: null,
    });
  });

  it('sem descrição, usa o nome da categoria', () => {
    expect(montarGastoRapido({ ...ENTRADA, descricao: '  ' }).conta?.nome).toBe('Alimentação');
  });

  it('pede valor, categoria e data', () => {
    expect(montarGastoRapido({ ...ENTRADA, valorCentavos: 0 }).erro).toBe('Informe quanto gastou');
    expect(montarGastoRapido({ ...ENTRADA, categoria: null }).erro).toBe('Escolha a categoria');
    expect(montarGastoRapido({ ...ENTRADA, dataIso: null }).erro).toBe('Informe uma data válida');
  });
});

describe('contasRepo.registrarGastoRapido', () => {
  it('grava a conta e o lançamento pago, que aparece no mês', async () => {
    const db = await criarBanco();
    const gasto = montarGastoRapido(ENTRADA);
    if (gasto.erro !== null) throw new Error(gasto.erro);
    await contasRepo.registrarGastoRapido(db, gasto.conta, gasto.lancamento);

    const doMes = await lancamentosRepo.listarPorMes(db, '2026-10');
    expect(doMes).toHaveLength(1);
    expect(doMes[0]).toMatchObject({ conta_nome: 'Mercado', valor_centavos: 15990, pago: 1 });
  });
});

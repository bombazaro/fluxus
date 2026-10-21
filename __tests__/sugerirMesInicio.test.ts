import { sugerirMesInicio } from '../src/domain/gerarLancamentos';

describe('sugerirMesInicio', () => {
  const HOJE = '2026-10-21';

  it('usa o mês que a pessoa está vendo', () => {
    expect(sugerirMesInicio('2026-11', 10, HOJE)).toBe('2026-11');
    expect(sugerirMesInicio('2027-02', 5, HOJE)).toBe('2027-02');
  });

  it('no mês atual, mantém o mês se o vencimento ainda não passou', () => {
    expect(sugerirMesInicio('2026-10', 25, HOJE)).toBe('2026-10');
    expect(sugerirMesInicio('2026-10', 21, HOJE)).toBe('2026-10');
  });

  it('no mês atual, pula para o próximo se o vencimento já passou', () => {
    // Conta do dia 10 cadastrada no dia 21: a primeira cobrança é em novembro
    expect(sugerirMesInicio('2026-10', 10, HOJE)).toBe('2026-11');
  });

  it('vendo um mês passado, começa a partir do mês atual', () => {
    expect(sugerirMesInicio('2026-08', 25, HOJE)).toBe('2026-10');
    expect(sugerirMesInicio('2026-08', 10, HOJE)).toBe('2026-11');
  });

  it('conta sem vencimento começa no mês visto (vence no fim do mês)', () => {
    expect(sugerirMesInicio('2026-10', null, HOJE)).toBe('2026-10');
    expect(sugerirMesInicio('2026-12', null, HOJE)).toBe('2026-12');
  });

  it('dia 31 em mês curto usa o último dia para comparar', () => {
    expect(sugerirMesInicio('2026-11', 31, '2026-11-30')).toBe('2026-11');
  });
});

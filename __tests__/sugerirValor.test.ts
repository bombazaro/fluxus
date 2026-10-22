import { calcularMediaLancamentos } from '../src/domain/sugerirValor';

describe('calcularMediaLancamentos', () => {
  it('retorna null quando a lista é vazia', () => {
    expect(calcularMediaLancamentos([])).toBeNull();
  });

  it('calcula a média de 3 meses corretamente', () => {
    const historico = [
      { valor_centavos: 10000 }, // 100
      { valor_centavos: 20000 }, // 200
      { valor_centavos: 15000 }, // 150
    ];
    // (100 + 200 + 150) / 3 = 150 -> 15000
    expect(calcularMediaLancamentos(historico, 3)).toBe(15000);
  });

  it('arredonda centavos sem decimais', () => {
    const historico = [{ valor_centavos: 10001 }, { valor_centavos: 10002 }];
    // (10001 + 10002) / 2 = 10001.5 -> arredonda para 10002
    expect(calcularMediaLancamentos(historico, 2)).toBe(10002);
  });

  it('respeita o limite de meses configurável', () => {
    const historico = [
      { valor_centavos: 10000 },
      { valor_centavos: 20000 },
      { valor_centavos: 30000 },
      { valor_centavos: 100000 }, // 4º mês ignorado quando limite é 3
    ];
    expect(calcularMediaLancamentos(historico, 3)).toBe(20000);
  });
});

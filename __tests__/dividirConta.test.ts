import {
  dividirContaPorIgual,
  dividirContaPorPorcentagem,
} from '../src/domain/dividirConta';

describe('dividirConta', () => {
  it('divide por igual sem resto', () => {
    const divisao = dividirContaPorIgual(10000, 2);
    expect(divisao).toEqual([5000, 5000]);
    expect(divisao.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('divide por igual com resto de centavos garantindo a soma exata', () => {
    // R$ 10,00 dividido por 3 pessoas = 1000 centavos / 3
    const divisao = dividirContaPorIgual(1000, 3);
    expect(divisao).toEqual([334, 333, 333]);
    expect(divisao.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('divide por porcentagem fechando a soma exata', () => {
    // R$ 100,00 (10000 centavos): 33.33%, 33.33%, 33.34%
    const divisao = dividirContaPorPorcentagem(10000, [33.33, 33.33, 33.34]);
    expect(divisao.reduce((a, b) => a + b, 0)).toBe(10000);
  });
});

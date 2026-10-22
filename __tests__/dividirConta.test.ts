import {
  dividirContaPorIgual,
  dividirContaPorPorcentagem,
  montarDivisao,
  redistribuirDivisao,
} from '../src/domain/dividirConta';
import { formatarMoeda } from '../src/utils/formatadores';

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

  it('repete a proporção da divisão anterior para um novo valor', () => {
    expect(redistribuirDivisao([6000, 4000], 15000)).toEqual([9000, 6000]);
  });

  it('redistribui com centavos quebrados fechando a soma exata', () => {
    const divisao = redistribuirDivisao([334, 333, 333], 1001);
    expect(divisao.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it('divide por igual quando a divisão anterior somava zero', () => {
    expect(redistribuirDivisao([0, 0], 1000)).toEqual([500, 500]);
  });
});

describe('montarDivisao', () => {
  it('por igual, entre as pessoas escolhidas', () => {
    expect(montarDivisao(1000, [1, 2, 3], 'igual', {})).toEqual({
      valores: [334, 333, 333],
      erro: null,
    });
  });

  it('por porcentagem, quando a soma fecha 100%', () => {
    expect(montarDivisao(10000, [1, 2], 'porcentagem', { 1: 60, 2: 40 })).toEqual({
      valores: [6000, 4000],
      erro: null,
    });
    expect(
      montarDivisao(1000, [1, 2, 3], 'porcentagem', { 1: 33.33, 2: 33.33, 3: 33.34 }).valores
    ).toEqual([333, 333, 334]);
  });

  it('por porcentagem, avisa quanto falta ou passa de 100%', () => {
    expect(montarDivisao(10000, [1, 2], 'porcentagem', { 1: 60, 2: 30 })).toEqual({
      valores: null,
      erro: 'As porcentagens somam 90%. Precisam fechar 100%.',
    });
    expect(montarDivisao(10000, [1, 2], 'porcentagem', { 1: 60 }).erro).toContain('60%');
  });

  it('por valor, quando a soma fecha o total', () => {
    expect(montarDivisao(10000, [1, 2], 'valor', { 1: 7000, 2: 3000 })).toEqual({
      valores: [7000, 3000],
      erro: null,
    });
  });

  it('por valor, avisa quanto falta ou sobra', () => {
    expect(montarDivisao(10000, [1, 2], 'valor', { 1: 7000, 2: 2000 }).erro).toBe(
      `Faltam ${formatarMoeda(1000)} para fechar o valor da conta.`
    );
    expect(montarDivisao(10000, [1, 2], 'valor', { 1: 7000, 2: 4000 }).erro).toBe(
      `A divisão passa ${formatarMoeda(1000)} do valor da conta.`
    );
  });

  it('sem ninguém escolhido, não divide', () => {
    expect(montarDivisao(10000, [], 'igual', {}).erro).toBe('Escolha com quem dividir.');
  });
});

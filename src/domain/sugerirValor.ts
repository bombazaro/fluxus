export interface SugestaoValor {
  valorSugeridoCentavos: number | null;
  mesesConsiderados: number;
}

/**
 * Calcula a média simples de valores em centavos de lançamentos pagos passados.
 * Retorna null se não houver lançamentos válidos.
 * Garante resultado em centavos inteiros (arredonda para o centavo mais próximo).
 */
export function calcularMediaLancamentos(
  lancamentosPagos: { valor_centavos: number }[],
  limiteMeses = 3
): number | null {
  if (!lancamentosPagos || lancamentosPagos.length === 0) {
    return null;
  }

  const selecionados = lancamentosPagos.slice(0, limiteMeses);
  if (selecionados.length === 0) {
    return null;
  }

  const soma = selecionados.reduce((acc, curr) => acc + curr.valor_centavos, 0);
  return Math.round(soma / selecionados.length);
}

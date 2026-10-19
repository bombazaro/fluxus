import { Lancamento, LancamentoComDetalhes, Renda } from '@/src/types';

export interface ResumoMes {
  totalContas: number;
  totalPago: number;
  faltaPagar: number;
  rendaTotal: number;
  sobra: number;
  sobraAtual: number;
  percentualUsado: number;
}

export interface OpcoesResumo {
  considerarApenasMinhaParte?: boolean;
}

/**
 * Calcula o resumo financeiro do mês a partir dos lançamentos e rendas.
 * Função pura, sem efeitos colaterais.
 * Todos os valores monetários estão em centavos inteiros.
 */
export function resumoDoMes(
  lancamentos: (Lancamento | LancamentoComDetalhes)[],
  rendas: Renda[],
  opcoes?: OpcoesResumo
): ResumoMes {
  const considerarMinhaParte = opcoes?.considerarApenasMinhaParte ?? true;

  let totalContas = 0;
  let totalPago = 0;

  for (const l of lancamentos) {
    let valor = l.valor_centavos;
    const lDetalhe = l as LancamentoComDetalhes;
    if (
      considerarMinhaParte &&
      lDetalhe.compartilhada === 1 &&
      typeof lDetalhe.minha_parte_centavos === 'number'
    ) {
      valor = lDetalhe.minha_parte_centavos;
    }

    totalContas += valor;
    if (l.pago === 1) {
      totalPago += valor;
    }
  }

  const faltaPagar = Math.max(0, totalContas - totalPago);

  let rendaTotal = 0;
  for (const r of rendas) {
    if (r.ativa === 1) {
      rendaTotal += r.valor_centavos;
    }
  }

  const sobra = rendaTotal - totalContas;
  const sobraAtual = rendaTotal - totalPago;

  let percentualUsado = 0;
  if (rendaTotal > 0) {
    percentualUsado = totalContas / rendaTotal;
  } else if (totalContas > 0) {
    percentualUsado = 1;
  }

  return {
    totalContas,
    totalPago,
    faltaPagar,
    rendaTotal,
    sobra,
    sobraAtual,
    percentualUsado,
  };
}

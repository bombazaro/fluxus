import { LancamentoComDetalhes } from '../types';

export interface TotalCategoria {
  categoriaId: number;
  nome: string;
  cor: string;
  icone: string;
  totalCentavos: number;
}

/**
 * Soma os lançamentos do mês por categoria (só a parte do usuário nas
 * compartilhadas, se contarSoMinhaParte), do maior gasto para o menor.
 */
export function totaisPorCategoria(
  lancamentos: LancamentoComDetalhes[],
  contarSoMinhaParte = true
): TotalCategoria[] {
  const mapa = new Map<number, TotalCategoria>();

  for (const l of lancamentos) {
    const valor =
      contarSoMinhaParte && l.compartilhada === 1 && typeof l.minha_parte_centavos === 'number'
        ? l.minha_parte_centavos
        : l.valor_centavos;

    const existente = mapa.get(l.categoria_id);
    if (existente) {
      existente.totalCentavos += valor;
    } else {
      mapa.set(l.categoria_id, {
        categoriaId: l.categoria_id,
        nome: l.categoria_nome,
        cor: l.categoria_cor,
        icone: l.categoria_icone,
        totalCentavos: valor,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.totalCentavos - a.totalCentavos);
}

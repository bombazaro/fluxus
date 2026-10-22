import { LancamentoComDetalhes } from '../types';
import { totaisPorCategoria } from './totaisPorCategoria';

export interface ComparacaoCategoria {
  categoriaId: number;
  nome: string;
  cor: string;
  atual: number;
  anterior: number;
  diferenca: number;
  /** Variação em fração (0.12 = 12% a mais); null se não havia gasto antes. */
  percentual: number | null;
}

export interface ComparacaoMeses {
  totalAtual: number;
  totalAnterior: number;
  diferenca: number;
  percentual: number | null;
  /** Do maior gasto deste mês para o menor. */
  categorias: ComparacaoCategoria[];
  /** Categoria que mais subiu em reais (null se nenhuma subiu). */
  maiorAlta: ComparacaoCategoria | null;
}

function variacao(atual: number, anterior: number): number | null {
  return anterior > 0 ? (atual - anterior) / anterior : null;
}

/** Compara os gastos de dois meses, no total e por categoria. */
export function compararMeses(
  atual: LancamentoComDetalhes[],
  anterior: LancamentoComDetalhes[],
  contarSoMinhaParte = true
): ComparacaoMeses {
  const mapa = new Map<number, ComparacaoCategoria>();

  for (const t of totaisPorCategoria(anterior, contarSoMinhaParte)) {
    mapa.set(t.categoriaId, {
      categoriaId: t.categoriaId,
      nome: t.nome,
      cor: t.cor,
      atual: 0,
      anterior: t.totalCentavos,
      diferenca: 0,
      percentual: null,
    });
  }
  for (const t of totaisPorCategoria(atual, contarSoMinhaParte)) {
    const existente = mapa.get(t.categoriaId);
    mapa.set(t.categoriaId, {
      categoriaId: t.categoriaId,
      nome: t.nome,
      cor: t.cor,
      atual: t.totalCentavos,
      anterior: existente?.anterior ?? 0,
      diferenca: 0,
      percentual: null,
    });
  }

  const categorias = Array.from(mapa.values())
    .map((c) => ({
      ...c,
      diferenca: c.atual - c.anterior,
      percentual: variacao(c.atual, c.anterior),
    }))
    .sort((a, b) => b.atual - a.atual || b.anterior - a.anterior);

  const totalAtual = categorias.reduce((soma, c) => soma + c.atual, 0);
  const totalAnterior = categorias.reduce((soma, c) => soma + c.anterior, 0);

  const maiorAlta = categorias.reduce<ComparacaoCategoria | null>(
    (maior, c) => (c.diferenca > 0 && (!maior || c.diferenca > maior.diferenca) ? c : maior),
    null
  );

  return {
    totalAtual,
    totalAnterior,
    diferenca: totalAtual - totalAnterior,
    percentual: variacao(totalAtual, totalAnterior),
    categorias,
    maiorAlta,
  };
}

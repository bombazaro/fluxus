import { formatarMoeda } from '../utils/formatadores';

export type NivelAperto = 'normal' | 'atencao' | 'aperto' | 'critico';

export interface ResultadoAperto {
  nivel: NivelAperto;
  mensagem: string;
  percentual: number;
}

export interface ConfiguracaoAperto {
  limiteAtencaoPercentual?: number; // padrão 80 (80%)
  limiteApertoPercentual?: number;   // padrão 100 (100%)
}

/**
 * Avalia o nível de aperto financeiro do mês baseado no total de contas e na renda total.
 * Retorna o nível de risco e mensagem clara em português.
 */
export function avaliarAperto(
  totalContasCentavos: number,
  rendaTotalCentavos: number,
  config?: ConfiguracaoAperto
): ResultadoAperto {
  const limiteAtencao = (config?.limiteAtencaoPercentual ?? 80) / 100;
  const limiteAperto = (config?.limiteApertoPercentual ?? 100) / 100;

  if (rendaTotalCentavos === 0) {
    if (totalContasCentavos === 0) {
      return {
        nivel: 'normal',
        mensagem: 'Sem despesas cadastradas',
        percentual: 0,
      };
    }
    return {
      nivel: 'critico',
      mensagem: `Você possui ${formatarMoeda(totalContasCentavos)} em contas sem renda cadastrada`,
      percentual: 1,
    };
  }

  const percentual = totalContasCentavos / rendaTotalCentavos;

  if (percentual > limiteAperto) {
    const diferenca = totalContasCentavos - rendaTotalCentavos;
    return {
      nivel: 'aperto',
      mensagem: `Faltam ${formatarMoeda(diferenca)} para fechar o mês no positivo`,
      percentual,
    };
  }

  if (percentual >= limiteAtencao) {
    const percentualFormatado = Math.round(percentual * 100);
    return {
      nivel: 'atencao',
      mensagem: `Atenção: suas contas já consomem ${percentualFormatado}% da sua renda`,
      percentual,
    };
  }

  return {
    nivel: 'normal',
    mensagem: 'Contas sob controle neste mês',
    percentual,
  };
}

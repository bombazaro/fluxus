import { formatarMoeda } from '../utils/formatadores';

export type NivelAperto = 'normal' | 'atencao' | 'aperto' | 'critico';

export interface ResultadoAperto {
  nivel: NivelAperto;
  mensagem: string;
  percentual: number;
}

export interface EntradaAperto {
  totalContasCentavos: number;
  rendaTotalCentavos: number;
  /** O que sobrou do mês anterior (entra como dinheiro disponível). */
  saldoInicialCentavos?: number;
  /** Dia do mês com o menor saldo, vindo do saldoPorDia. */
  menorSaldo?: { valorCentavos: number; dia: number };
  /** % do dinheiro do mês a partir do qual o aviso fica amarelo (padrão 80). */
  limiteAtencaoPercentual?: number;
}

/**
 * Avalia o aperto do mês, do mais grave para o mais leve:
 * - 'aperto' (vermelho): as contas passam do dinheiro do mês (renda + sobra anterior);
 * - 'critico' (vermelho): o mês fecha, mas em algum dia o saldo fica negativo
 *   porque as contas vencem antes de a renda cair;
 * - 'atencao' (amarelo): as contas passam do limite (80%) do dinheiro do mês;
 * - 'normal'.
 */
export function avaliarAperto(entrada: EntradaAperto): ResultadoAperto {
  const {
    totalContasCentavos: contas,
    rendaTotalCentavos: renda,
    saldoInicialCentavos = 0,
    menorSaldo,
    limiteAtencaoPercentual = 80,
  } = entrada;

  if (contas === 0) {
    return { nivel: 'normal', mensagem: 'Sem despesas cadastradas', percentual: 0 };
  }

  const disponivel = renda + saldoInicialCentavos;
  const percentual = disponivel > 0 ? contas / disponivel : 1;

  if (contas > disponivel) {
    return {
      nivel: 'aperto',
      mensagem: `Faltam ${formatarMoeda(contas - disponivel)} para fechar o mês`,
      percentual,
    };
  }

  if (menorSaldo && menorSaldo.valorCentavos < 0) {
    return {
      nivel: 'critico',
      mensagem: `No dia ${String(menorSaldo.dia).padStart(2, '0')} faltam ${formatarMoeda(
        -menorSaldo.valorCentavos
      )}: as contas vencem antes de a renda cair`,
      percentual,
    };
  }

  if (percentual * 100 >= limiteAtencaoPercentual) {
    return {
      nivel: 'atencao',
      mensagem: `Atenção: suas contas já consomem ${Math.round(percentual * 100)}% do dinheiro do mês`,
      percentual,
    };
  }

  return { nivel: 'normal', mensagem: 'Contas sob controle neste mês', percentual };
}

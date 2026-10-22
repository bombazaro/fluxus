import { adicionarMeses } from './gerarLancamentos';
import { MesPrevisto } from './preverSaldo';

export interface SimulacaoParcelas {
  parcelaCentavos: number;
  totalCentavos: number;
  jurosCentavos: number;
}

/**
 * Valor da parcela de uma compra parcelada. Sem juros, divide o valor (arredondando
 * para cima, para o total cobrir a compra). Com juros, usa a tabela Price:
 * parcela = valor × i / (1 − (1 + i)^−n).
 */
export function simularParcelas(
  valorTotalCentavos: number,
  parcelas: number,
  jurosMensalPercentual: number
): SimulacaoParcelas {
  const n = Math.max(1, Math.floor(parcelas));
  const i = jurosMensalPercentual / 100;

  const parcelaCentavos =
    i > 0
      ? Math.round((valorTotalCentavos * i) / (1 - Math.pow(1 + i, -n)))
      : Math.ceil(valorTotalCentavos / n);
  const totalCentavos = parcelaCentavos * n;

  return {
    parcelaCentavos,
    totalCentavos,
    jurosCentavos: Math.max(0, totalCentavos - valorTotalCentavos),
  };
}

export type Veredito = 'folga' | 'aperta' | 'nao_cabe';

export interface ImpactoCompra {
  comCompra: MesPrevisto[];
  /** Mês com a menor sobra, entre os meses com parcela. */
  piorMes: { mesRef: string; sobraCentavos: number } | null;
  veredito: Veredito;
}

/** Abaixo disso (fração da renda do mês), a sobra que fica é considerada apertada. */
export const FOLGA_MINIMA = 0.1;

/**
 * Soma a parcela simulada à previsão dos meses da compra e dá um veredito:
 * "não cabe" se algum mês fica negativo; "aperta" se a sobra de algum mês fica
 * abaixo de 10% da renda; "folga" no resto. Nada é gravado.
 */
export function simularImpacto(
  base: MesPrevisto[],
  parcelaCentavos: number,
  mesPrimeiraParcela: string,
  parcelas: number
): ImpactoCompra {
  const ultimoMes = adicionarMeses(mesPrimeiraParcela, Math.max(1, parcelas) - 1);
  const temParcela = (mesRef: string) => mesRef >= mesPrimeiraParcela && mesRef <= ultimoMes;

  const comCompra = base.map((m) =>
    temParcela(m.mesRef)
      ? {
          ...m,
          contasCentavos: m.contasCentavos + parcelaCentavos,
          sobraCentavos: m.sobraCentavos - parcelaCentavos,
        }
      : m
  );

  const afetados = comCompra.filter((m) => temParcela(m.mesRef));
  const pior = afetados.reduce<MesPrevisto | null>(
    (menor, m) => (!menor || m.sobraCentavos < menor.sobraCentavos ? m : menor),
    null
  );

  let veredito: Veredito = 'folga';
  if (afetados.some((m) => m.sobraCentavos < 0)) {
    veredito = 'nao_cabe';
  } else if (afetados.some((m) => m.sobraCentavos < m.rendaCentavos * FOLGA_MINIMA)) {
    veredito = 'aperta';
  }

  return {
    comCompra,
    piorMes: pior ? { mesRef: pior.mesRef, sobraCentavos: pior.sobraCentavos } : null,
    veredito,
  };
}

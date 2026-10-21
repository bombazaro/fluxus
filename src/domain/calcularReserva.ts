import { ReservaAporte, ReservaMeta } from '../types';
import { adicionarMeses } from './gerarLancamentos';

/** Quantos meses de aportes entram no "ritmo" para estimar a data da meta. */
export const MESES_RITMO = 3;

export interface SituacaoReserva {
  metaCentavos: number;
  guardadoCentavos: number;
  /** Guardado / meta (pode passar de 1). 0 sem meta. */
  percentual: number;
  faltaCentavos: number;
  /** Média mensal guardada nos últimos meses (null se não houve aporte). */
  ritmoMensalCentavos: number | null;
  /** Meses para chegar à meta nesse ritmo (0 = já chegou; null = sem ritmo). */
  mesesParaMeta: number | null;
  metaBatida: boolean;
}

/** Valor da meta: fixo, ou X meses do gasto mensal médio. */
export function valorDaMeta(meta: ReservaMeta | null, gastoMensalCentavos: number): number {
  if (!meta) return 0;
  if (meta.tipo_meta === 'meses_gastos') {
    return (meta.meses_gastos ?? 6) * gastoMensalCentavos;
  }
  return meta.valor_meta_centavos;
}

/**
 * Situação da reserva de emergência. Retiradas são aportes negativos.
 * O ritmo é o líquido guardado nos últimos 3 meses (incluindo o atual) dividido
 * pelos meses desde o primeiro aporte dessa janela, para quem começou há pouco.
 */
export function calcularReserva(
  meta: ReservaMeta | null,
  aportes: ReservaAporte[],
  gastoMensalCentavos: number,
  hojeIso: string
): SituacaoReserva {
  const metaCentavos = valorDaMeta(meta, gastoMensalCentavos);
  const guardadoCentavos = aportes.reduce((soma, a) => soma + a.valor_centavos, 0);
  const faltaCentavos = Math.max(0, metaCentavos - guardadoCentavos);

  const mesAtual = hojeIso.slice(0, 7);
  const inicioJanela = adicionarMeses(mesAtual, -(MESES_RITMO - 1));
  const naJanela = aportes.filter((a) => a.data.slice(0, 7) >= inicioJanela);
  const liquido = naJanela.reduce((soma, a) => soma + a.valor_centavos, 0);

  let ritmoMensalCentavos: number | null = null;
  if (naJanela.length > 0 && liquido > 0) {
    const primeiroMes = naJanela.map((a) => a.data.slice(0, 7)).sort()[0];
    const [anoP, mesP] = primeiroMes.split('-').map(Number);
    const [anoA, mesA] = mesAtual.split('-').map(Number);
    const meses = (anoA - anoP) * 12 + (mesA - mesP) + 1;
    ritmoMensalCentavos = Math.round(liquido / meses);
  }

  const metaBatida = metaCentavos > 0 && guardadoCentavos >= metaCentavos;
  const mesesParaMeta =
    metaCentavos > 0 && faltaCentavos === 0
      ? 0
      : ritmoMensalCentavos
        ? Math.ceil(faltaCentavos / ritmoMensalCentavos)
        : null;

  return {
    metaCentavos,
    guardadoCentavos,
    percentual: metaCentavos > 0 ? guardadoCentavos / metaCentavos : 0,
    faltaCentavos,
    ritmoMensalCentavos,
    mesesParaMeta,
    metaBatida,
  };
}

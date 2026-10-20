import { LancamentoComDetalhes, Renda } from '../types';
import { obterUltimoDiaDoMes } from './gerarLancamentos';
import { formatarMoeda } from '../utils/formatadores';

export interface PontoSaldoDia {
  dia: number;
  dataIso: string;
  entradasCentavos: number;
  saidasCentavos: number;
  saldoCentavos: number;
}

export interface ResultadoSaldoPorDia {
  pontos: PontoSaldoDia[];
  menorSaldoCentavos: number;
  diaMenorSaldo: number;
  saldoFinalCentavos: number;
  mensagemAperto: string;
}

/**
 * Calcula a evolução diária do saldo ao longo do mês, mapeando quando as rendas caem
 * e quando as contas vencem. Identifica o dia em que o saldo do usuário fica mais baixo.
 */
export function calcularSaldoPorDia(
  mesRef: string,
  lancamentos: LancamentoComDetalhes[],
  rendas: Renda[],
  saldoInicialCentavos = 0
): ResultadoSaldoPorDia {
  const [anoStr, mesStr] = mesRef.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const totalDias = obterUltimoDiaDoMes(ano, mes);

  // Mapear entradas por dia
  const entradasPorDia = new Map<number, number>();
  for (const r of rendas) {
    if (r.ativa === 1) {
      const dia = Math.min(r.dia_recebimento, totalDias);
      const atual = entradasPorDia.get(dia) || 0;
      entradasPorDia.set(dia, atual + r.valor_centavos);
    }
  }

  // Mapear saídas por dia
  const saidasPorDia = new Map<number, number>();
  for (const l of lancamentos) {
    const diaVenc = parseInt(l.vencimento.slice(8, 10), 10);
    const dia = Math.min(diaVenc, totalDias);
    const valor =
      l.compartilhada === 1 && typeof l.minha_parte_centavos === 'number'
        ? l.minha_parte_centavos
        : l.valor_centavos;

    const atual = saidasPorDia.get(dia) || 0;
    saidasPorDia.set(dia, atual + valor);
  }

  const pontos: PontoSaldoDia[] = [];
  let saldoAcumulado = saldoInicialCentavos;

  let menorSaldo = saldoInicialCentavos;
  let diaMenorSaldo = 1;

  for (let dia = 1; dia <= totalDias; dia++) {
    const entradas = entradasPorDia.get(dia) || 0;
    const saidas = saidasPorDia.get(dia) || 0;

    saldoAcumulado = saldoAcumulado + entradas - saidas;

    const diaFormatado = String(dia).padStart(2, '0');
    const mesFormatado = String(mes).padStart(2, '0');
    const dataIso = `${ano}-${mesFormatado}-${diaFormatado}`;

    pontos.push({
      dia,
      dataIso,
      entradasCentavos: entradas,
      saidasCentavos: saidas,
      saldoCentavos: saldoAcumulado,
    });

    if (saldoAcumulado < menorSaldo || dia === 1) {
      menorSaldo = saldoAcumulado;
      diaMenorSaldo = dia;
    }
  }

  const mensagemAperto =
    menorSaldo < 0
      ? `Atenção: no dia ${String(diaMenorSaldo).padStart(2, '0')}, o saldo fica negativo em ${formatarMoeda(
          Math.abs(menorSaldo)
        )} antes de outras entradas caírem.`
      : `O dia com menor saldo do mês é o dia ${String(diaMenorSaldo).padStart(
          2,
          '0'
        )}, com ${formatarMoeda(menorSaldo)} restantes.`;

  return {
    pontos,
    menorSaldoCentavos: menorSaldo,
    diaMenorSaldo,
    saldoFinalCentavos: saldoAcumulado,
    mensagemAperto,
  };
}

import { LancamentoComDetalhes, Renda } from '../types';
import { classificarSituacao } from './classificarSituacao';
import { obterUltimoDiaDoMes } from './gerarLancamentos';

export type MarcaDia = 'atrasada' | 'pendente' | 'paga' | 'renda';

export interface DiaCalendario {
  dia: number;
  dataIso: string; // '2026-05-10'
  marcas: MarcaDia[];
  totalContasCentavos: number;
  ehHoje: boolean;
}

/** Semana começando no domingo; null é um espaço vazio antes do dia 1 ou depois do último dia. */
export type SemanaCalendario = (DiaCalendario | null)[];

const ORDEM_MARCAS: MarcaDia[] = ['atrasada', 'pendente', 'paga', 'renda'];

/**
 * Monta a grade do mês (semanas de domingo a sábado) com as marcas de cada dia:
 * atrasada, pendente e paga pelos lançamentos e renda pelo dia de recebimento.
 */
export function montarCalendario(
  mesRef: string,
  lancamentos: LancamentoComDetalhes[],
  rendas: Renda[],
  hojeIso: string
): SemanaCalendario[] {
  const [ano, mes] = mesRef.split('-').map(Number);
  const totalDias = obterUltimoDiaDoMes(ano, mes);

  const marcasPorDia = new Map<number, Set<MarcaDia>>();
  const totalPorDia = new Map<number, number>();

  const marcar = (dia: number, marca: MarcaDia) => {
    const marcas = marcasPorDia.get(dia) ?? new Set<MarcaDia>();
    marcas.add(marca);
    marcasPorDia.set(dia, marcas);
  };

  for (const l of lancamentos) {
    // Sem data de vencimento: não marca nenhum dia (a tela lista essas contas à parte)
    if (l.sem_vencimento === 1) continue;

    const dia = Math.min(parseInt(l.vencimento.slice(8, 10), 10), totalDias);
    const situacao = classificarSituacao(l.vencimento, l.pago, hojeIso);
    marcar(
      dia,
      situacao === 'paga' ? 'paga' : situacao === 'atrasada' ? 'atrasada' : 'pendente'
    );

    const valor =
      l.compartilhada === 1 && typeof l.minha_parte_centavos === 'number'
        ? l.minha_parte_centavos
        : l.valor_centavos;
    totalPorDia.set(dia, (totalPorDia.get(dia) ?? 0) + valor);
  }

  for (const r of rendas) {
    if (r.ativa === 1) {
      marcar(Math.min(r.dia_recebimento, totalDias), 'renda');
    }
  }

  const mesFormatado = String(mes).padStart(2, '0');
  const diaDaSemanaDoDia1 = new Date(ano, mes - 1, 1).getDay();

  const celulas: (DiaCalendario | null)[] = Array(diaDaSemanaDoDia1).fill(null);
  for (let dia = 1; dia <= totalDias; dia++) {
    const dataIso = `${ano}-${mesFormatado}-${String(dia).padStart(2, '0')}`;
    const marcas = marcasPorDia.get(dia) ?? new Set<MarcaDia>();
    celulas.push({
      dia,
      dataIso,
      marcas: ORDEM_MARCAS.filter((m) => marcas.has(m)),
      totalContasCentavos: totalPorDia.get(dia) ?? 0,
      ehHoje: dataIso === hojeIso,
    });
  }
  while (celulas.length % 7 !== 0) {
    celulas.push(null);
  }

  const semanas: SemanaCalendario[] = [];
  for (let i = 0; i < celulas.length; i += 7) {
    semanas.push(celulas.slice(i, i + 7));
  }
  return semanas;
}

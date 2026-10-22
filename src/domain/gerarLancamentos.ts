import { Conta, Lancamento } from '@/src/types';

/**
 * Retorna o último dia de um determinado mês e ano.
 * Ex: ano 2026, mes 2 -> 28
 * Ex: ano 2024, mes 2 -> 29 (bissexto)
 * Ex: ano 2026, mes 4 -> 30
 */
export function obterUltimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Ajusta o dia de vencimento desejado para caber no mês correspondente.
 * Se o dia for 31 e o mês tiver 30 dias (ou 28/29 em fevereiro), retorna o último dia do mês.
 * Retorna string no formato YYYY-MM-DD.
 */
export function ajustarDiaDoMes(ano: number, mes: number, diaDesejado: number): string {
  const ultimoDia = obterUltimoDiaDoMes(ano, mes);
  const diaReal = Math.min(Math.max(1, diaDesejado), ultimoDia);
  const mesFormatado = String(mes).padStart(2, '0');
  const diaFormatado = String(diaReal).padStart(2, '0');
  return `${ano}-${mesFormatado}-${diaFormatado}`;
}

/**
 * Adiciona N meses a um mês de referência (formato YYYY-MM).
 * Ex: adicionarMeses('2026-01', 3) -> '2026-04'
 * Ex: adicionarMeses('2026-11', 3) -> '2027-02'
 */
export function adicionarMeses(mesRef: string, quantidade: number): string {
  const [anoStr, mesStr] = mesRef.split('-');
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);

  const data = new Date(ano, mes - 1 + quantidade, 1);
  const novoAno = data.getFullYear();
  const novoMes = String(data.getMonth() + 1).padStart(2, '0');
  return `${novoAno}-${novoMes}`;
}

/** Dia usado para conta sem data de vencimento: o último dia do mês (31 é ajustado). */
export const DIA_SEM_VENCIMENTO = 31;

/** Dia de vencimento efetivo de uma conta recorrente (sem vencimento = último dia do mês). */
export function diaDeVencimento(conta: Pick<Conta, 'dia_vencimento' | 'sem_vencimento'>): number {
  if (conta.sem_vencimento === 1) return DIA_SEM_VENCIMENTO;
  return conta.dia_vencimento || 1;
}

/**
 * Sugere o mês da primeira cobrança de uma conta nova (formato YYYY-MM).
 * Parte do mês que a pessoa está vendo, nunca antes do mês atual, e pula para o
 * mês seguinte se o vencimento já passou (senão a conta nasceria atrasada).
 * Conta sem vencimento (dia null) vence no último dia, então não pula.
 */
export function sugerirMesInicio(mesVisto: string, dia: number | null, hojeIso: string): string {
  const mesAtual = hojeIso.slice(0, 7);
  const inicio = mesVisto < mesAtual ? mesAtual : mesVisto;
  if (dia === null) return inicio;

  const [ano, mes] = inicio.split('-').map(Number);
  return ajustarDiaDoMes(ano, mes, dia) < hojeIso ? adicionarMeses(inicio, 1) : inicio;
}

/**
 * Gera os lançamentos previstos para uma conta recém-cadastrada.
 * Conta sem data de vencimento vence no último dia de cada mês.
 * - 'unica': gera 1 lançamento
 * - 'parcelada': gera todas as parcelas (1 até N)
 * - 'fixa' ou 'variavel': gera o primeiro lançamento do mês inicial
 */
export function gerarLancamentosParaConta(
  conta: Omit<Conta, 'id' | 'criado_em'> & { id?: number }
): Omit<Lancamento, 'id'>[] {
  const lancamentos: Omit<Lancamento, 'id'>[] = [];
  const contaId = conta.id ?? 0;

  if (conta.tipo === 'unica') {
    const [anoInicio, mesInicio] = conta.data_inicio.split('-').map(Number);
    const dataVenc =
      conta.sem_vencimento === 1
        ? ajustarDiaDoMes(anoInicio, mesInicio, DIA_SEM_VENCIMENTO)
        : conta.data_unica || conta.data_inicio;
    const mesRef = dataVenc.slice(0, 7);
    lancamentos.push({
      conta_id: contaId,
      mes_ref: mesRef,
      vencimento: dataVenc,
      valor_centavos: conta.valor_centavos,
      pago: 0,
      pago_em: null,
      parcela_numero: null,
    });
    return lancamentos;
  }

  if (conta.tipo === 'parcelada') {
    const totalParcelas = conta.parcelas_total || 1;
    const mesInicioRef = conta.data_inicio.slice(0, 7);
    const diaVenc =
      conta.sem_vencimento === 1
        ? DIA_SEM_VENCIMENTO
        : conta.dia_vencimento || parseInt(conta.data_inicio.slice(8, 10), 10) || 1;

    for (let i = 1; i <= totalParcelas; i++) {
      const mesRef = adicionarMeses(mesInicioRef, i - 1);
      const [anoStr, mesStr] = mesRef.split('-');
      const vencimento = ajustarDiaDoMes(parseInt(anoStr, 10), parseInt(mesStr, 10), diaVenc);

      lancamentos.push({
        conta_id: contaId,
        mes_ref: mesRef,
        vencimento,
        valor_centavos: conta.valor_centavos,
        pago: 0,
        pago_em: null,
        parcela_numero: i,
      });
    }
    return lancamentos;
  }

  // 'fixa' ou 'variavel'
  const mesRef = conta.data_inicio.slice(0, 7);
  const [anoStr, mesStr] = mesRef.split('-');
  const diaVenc = diaDeVencimento(conta);
  const vencimento = ajustarDiaDoMes(parseInt(anoStr, 10), parseInt(mesStr, 10), diaVenc);

  lancamentos.push({
    conta_id: contaId,
    mes_ref: mesRef,
    vencimento,
    valor_centavos: conta.valor_centavos,
    pago: 0,
    pago_em: null,
    parcela_numero: null,
  });

  return lancamentos;
}

import { SituacaoConta } from '../types';

/**
 * Classifica a situação do lançamento em:
 * - 'paga': se já foi pago (pago === 1)
 * - 'atrasada': se não pago e vencimento < hoje
 * - 'esta_semana': se não pago e vence em até 7 dias
 * - 'mais_adiante': se não pago e vence após 7 dias
 * - 'sem_vencimento': conta sem data, não paga, enquanto o mês não acabou
 *   (o vencimento guardado é o último dia do mês; depois dele, vira 'atrasada')
 */
export function classificarSituacao(
  vencimentoIso: string,
  pago: number,
  hojeIso: string,
  semVencimento = false
): SituacaoConta {
  if (pago === 1) return 'paga';
  if (vencimentoIso < hojeIso) return 'atrasada';
  if (semVencimento) return 'sem_vencimento';

  const [anoV, mesV, diaV] = vencimentoIso.split('-').map(Number);
  const [anoH, mesH, diaH] = hojeIso.split('-').map(Number);

  const dataV = new Date(anoV, mesV - 1, diaV);
  const dataH = new Date(anoH, mesH - 1, diaH);

  const diffMs = dataV.getTime() - dataH.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias <= 7) return 'esta_semana';
  return 'mais_adiante';
}

import { SituacaoConta } from '../types';

/**
 * Classifica a situação do lançamento em:
 * - 'paga': se já foi pago (pago === 1)
 * - 'atrasada': se não pago e vencimento < hoje
 * - 'esta_semana': se não pago e vence em até 7 dias
 * - 'mais_adiante': se não pago e vence após 7 dias
 */
export function classificarSituacao(
  vencimentoIso: string,
  pago: number,
  hojeIso: string
): SituacaoConta {
  if (pago === 1) return 'paga';
  if (vencimentoIso < hojeIso) return 'atrasada';

  const [anoV, mesV, diaV] = vencimentoIso.split('-').map(Number);
  const [anoH, mesH, diaH] = hojeIso.split('-').map(Number);

  const dataV = new Date(anoV, mesV - 1, diaV);
  const dataH = new Date(anoH, mesH - 1, diaH);

  const diffMs = dataV.getTime() - dataH.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias <= 7) return 'esta_semana';
  return 'mais_adiante';
}

import { Renda, RendaDoMes, RendaRecebida } from '../types';

/**
 * Mês em que a renda passa a valer. Pontual vale só no seu mes_ref;
 * fixa e variável valem a partir do mês em que foram cadastradas.
 */
function mesDaRenda(renda: Renda): string {
  return renda.mes_ref ?? renda.criado_em.slice(0, 7);
}

/**
 * Lista as rendas que entram no mês, já com o valor do mês:
 * - fixa e variável: todo mês, a partir do mês de cadastro, se ativas
 * - pontual: só no mês escolhido (mes_ref), se ativa
 * - marcada como recebida no mês: sempre entra, com o valor recebido
 */
export function rendasDoMes(
  rendas: Renda[],
  recebidas: RendaRecebida[],
  mesRef: string
): RendaDoMes[] {
  const recebidaPorRenda = new Map<number, RendaRecebida>();
  for (const r of recebidas) {
    if (r.mes_ref === mesRef) {
      recebidaPorRenda.set(r.renda_id, r);
    }
  }

  const resultado: RendaDoMes[] = [];
  for (const renda of rendas) {
    const recebida = recebidaPorRenda.get(renda.id);

    const valeNoMes =
      renda.tipo === 'pontual' ? mesDaRenda(renda) === mesRef : mesDaRenda(renda) <= mesRef;

    if (!recebida && (renda.ativa !== 1 || !valeNoMes)) continue;

    resultado.push({
      ...renda,
      ativa: 1,
      valor_centavos: recebida ? recebida.valor_centavos : renda.valor_centavos,
      valor_previsto_centavos: renda.valor_centavos,
      recebida: !!recebida,
    });
  }

  return resultado.sort((a, b) => a.dia_recebimento - b.dia_recebimento);
}

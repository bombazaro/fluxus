import { formatarMesAnoAbrev, formatarMoeda } from '../utils/formatadores';

/** Parte de uma conta dividida que outra pessoa ainda não acertou. */
export interface LinhaAcerto {
  divisao_id: number;
  pessoa_id: number;
  pessoa_nome: string;
  conta_nome: string;
  mes_ref: string;
  valor_centavos: number;
}

export interface AcertoPessoa {
  pessoaId: number;
  nome: string;
  totalCentavos: number;
  itens: LinhaAcerto[];
}

/** Agrupa as pendências por pessoa, de quem deve mais para quem deve menos. */
export function agruparAcertos(linhas: LinhaAcerto[]): AcertoPessoa[] {
  const porPessoa = new Map<number, AcertoPessoa>();
  for (const l of linhas) {
    const grupo = porPessoa.get(l.pessoa_id) ?? {
      pessoaId: l.pessoa_id,
      nome: l.pessoa_nome,
      totalCentavos: 0,
      itens: [],
    };
    grupo.totalCentavos += l.valor_centavos;
    grupo.itens.push(l);
    porPessoa.set(l.pessoa_id, grupo);
  }

  const grupos = Array.from(porPessoa.values());
  for (const g of grupos) {
    g.itens.sort((a, b) => a.mes_ref.localeCompare(b.mes_ref) || a.divisao_id - b.divisao_id);
  }
  return grupos.sort((a, b) => b.totalCentavos - a.totalCentavos);
}

/** Texto para compartilhar (WhatsApp etc.) e a outra pessoa conferir. */
export function textoAcerto(acerto: AcertoPessoa): string {
  return [
    `Oi, ${acerto.nome}! Resumo das contas divididas:`,
    '',
    ...acerto.itens.map(
      (i) => `• ${i.conta_nome} (${formatarMesAnoAbrev(i.mes_ref)}): ${formatarMoeda(i.valor_centavos)}`
    ),
    '',
    `Total: ${formatarMoeda(acerto.totalCentavos)}`,
  ].join('\n');
}

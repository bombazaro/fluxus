import { Conta, Renda, RendaRecebida } from '../types';
import { adicionarMeses } from './gerarLancamentos';
import { rendasDoMes } from './rendasDoMes';

/** Lançamento já cadastrado (parcela, conta única ou mês já aberto de uma fixa). */
export interface LancamentoPrevisao {
  id: number;
  conta_id: number;
  mes_ref: string;
  valor_centavos: number;
  /** Só em lançamento dividido: quanto é do usuário. */
  minha_parte_centavos?: number;
}

export interface DadosPrevisao {
  /** Contas ativas. */
  contas: Conta[];
  /** Lançamentos dos meses previstos. */
  lancamentos: LancamentoPrevisao[];
  /** Meses de contas fixas excluídos com "só este mês". */
  ignorados: { conta_id: number; mes_ref: string }[];
  rendas: Renda[];
  recebidas: RendaRecebida[];
  /** Média dos últimos pagamentos de cada conta variável, por id da conta. */
  mediaVariaveis: Record<number, number>;
  /** Fração do valor que é do usuário nas contas compartilhadas, por id da conta. */
  fracaoMinhaParte: Record<number, number>;
}

export interface MesPrevisto {
  mesRef: string;
  rendaCentavos: number;
  contasCentavos: number;
  sobraCentavos: number;
}

/** Fixa e variável: a conta vale no mês? (mesma regra do garantirMes) */
function contaRecorrenteNoMes(c: Conta, mesRef: string): boolean {
  return (
    (c.tipo === 'fixa' || c.tipo === 'variavel') &&
    c.data_inicio.slice(0, 7) <= mesRef &&
    (c.data_fim === null || c.data_fim >= `${mesRef}-01`)
  );
}

/**
 * Estimativa da sobra dos próximos meses, a partir do mês inicial:
 * - lançamentos já cadastrados (parcelas, contas únicas, meses já abertos);
 * - contas fixas pelo valor cadastrado e variáveis pela média, nos meses ainda
 *   não abertos (sem contar os meses excluídos);
 * - rendas que valem em cada mês (a pontual só no mês dela).
 */
export function preverSaldo(
  dados: DadosPrevisao,
  mesInicial: string,
  quantidadeMeses = 6,
  opcoes: { contarSoMinhaParte?: boolean } = {}
): MesPrevisto[] {
  const soMinhaParte = opcoes.contarSoMinhaParte ?? true;
  const contaPorId = new Map(dados.contas.map((c) => [c.id, c]));
  const existe = new Set(dados.lancamentos.map((l) => `${l.conta_id}|${l.mes_ref}`));
  const ignorado = new Set(dados.ignorados.map((i) => `${i.conta_id}|${i.mes_ref}`));

  const parteDoValor = (contaId: number, valor: number): number => {
    const c = contaPorId.get(contaId);
    if (!soMinhaParte || !c || c.compartilhada !== 1) return valor;
    const fracao = dados.fracaoMinhaParte[contaId];
    return fracao === undefined ? valor : Math.round(valor * fracao);
  };

  const meses: MesPrevisto[] = [];
  for (let i = 0; i < quantidadeMeses; i++) {
    const mesRef = adicionarMeses(mesInicial, i);
    let contasCentavos = 0;

    for (const l of dados.lancamentos) {
      if (l.mes_ref !== mesRef) continue;
      contasCentavos +=
        soMinhaParte && typeof l.minha_parte_centavos === 'number'
          ? l.minha_parte_centavos
          : l.valor_centavos;
    }

    for (const c of dados.contas) {
      const chave = `${c.id}|${mesRef}`;
      if (!contaRecorrenteNoMes(c, mesRef) || existe.has(chave) || ignorado.has(chave)) continue;
      const valor =
        c.tipo === 'variavel' ? dados.mediaVariaveis[c.id] ?? c.valor_centavos : c.valor_centavos;
      contasCentavos += parteDoValor(c.id, valor);
    }

    const rendaCentavos = rendasDoMes(dados.rendas, dados.recebidas, mesRef).reduce(
      (soma, r) => soma + r.valor_centavos,
      0
    );

    meses.push({
      mesRef,
      rendaCentavos,
      contasCentavos,
      sobraCentavos: rendaCentavos - contasCentavos,
    });
  }
  return meses;
}

export interface UltimaParcela {
  conta_id: number;
  nome: string;
  ultimo_mes: string;
  valor_parcela_centavos: number;
  parcelas_restantes: number;
}

export interface FimParcelamento {
  contaId: number;
  nome: string;
  ultimoMes: string;
  /** Primeiro mês sem a parcela. */
  liberaAPartirDe: string;
  valorCentavos: number;
  parcelasRestantes: number;
}

/** Parcelamentos que ainda não terminaram, do que acaba primeiro ao último. */
export function fimDosParcelamentos(parcelas: UltimaParcela[], mesAtual: string): FimParcelamento[] {
  return parcelas
    .filter((p) => p.ultimo_mes >= mesAtual)
    .sort((a, b) => a.ultimo_mes.localeCompare(b.ultimo_mes))
    .map((p) => ({
      contaId: p.conta_id,
      nome: p.nome,
      ultimoMes: p.ultimo_mes,
      liberaAPartirDe: adicionarMeses(p.ultimo_mes, 1),
      valorCentavos: p.valor_parcela_centavos,
      parcelasRestantes: p.parcelas_restantes,
    }));
}

import { Categoria, Conta, Lancamento } from '../types';

export interface EntradaGastoRapido {
  descricao: string;
  valorCentavos: number;
  categoria: Pick<Categoria, 'id' | 'nome'> | null;
  /** Dia do gasto (AAAA-MM-DD). */
  dataIso: string | null;
  /** Momento do registro, para o "pago em". */
  agoraIso: string;
}

export type ResultadoGastoRapido =
  | {
      conta: Omit<Conta, 'id' | 'criado_em'>;
      lancamento: Omit<Lancamento, 'id' | 'conta_id'>;
      erro: null;
    }
  | { conta: null; lancamento: null; erro: string };

/**
 * Um gasto avulso (mercado, lanche...) vira uma conta única já paga no dia do
 * gasto. Assim entra no resumo, nas categorias e na sobra como qualquer conta.
 * Sem descrição, o gasto leva o nome da categoria.
 */
export function montarGastoRapido(entrada: EntradaGastoRapido): ResultadoGastoRapido {
  const { descricao, valorCentavos, categoria, dataIso, agoraIso } = entrada;
  const falha = (erro: string) => ({ conta: null, lancamento: null, erro }) as const;

  if (valorCentavos <= 0) return falha('Informe quanto gastou');
  if (!categoria) return falha('Escolha a categoria');
  if (!dataIso) return falha('Informe uma data válida');

  return {
    conta: {
      nome: descricao.trim() || categoria.nome,
      categoria_id: categoria.id,
      tipo: 'unica',
      valor_centavos: valorCentavos,
      dia_vencimento: null,
      data_unica: dataIso,
      parcelas_total: null,
      data_inicio: dataIso,
      data_fim: null,
      ativa: 1,
      compartilhada: 0,
      sem_vencimento: 0,
    },
    lancamento: {
      mes_ref: dataIso.slice(0, 7),
      vencimento: dataIso,
      valor_centavos: valorCentavos,
      pago: 1,
      pago_em: agoraIso,
      parcela_numero: null,
    },
    erro: null,
  };
}

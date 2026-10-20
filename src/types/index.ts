export type TipoConta = 'unica' | 'fixa' | 'parcelada' | 'variavel';

export interface Categoria {
  id: number;
  nome: string;
  cor: string;
  icone: string;
}

export interface Conta {
  id: number;
  nome: string;
  categoria_id: number;
  tipo: TipoConta;
  valor_centavos: number;
  dia_vencimento: number | null;
  data_unica: string | null;
  parcelas_total: number | null;
  data_inicio: string;
  data_fim: string | null;
  ativa: number; // 0 ou 1
  compartilhada: number; // 0 ou 1
  sem_vencimento: number; // 0 ou 1: sem data, o lançamento fica no último dia do mês
  criado_em: string;
}

export interface Lancamento {
  id: number;
  conta_id: number;
  mes_ref: string; // '2026-05'
  vencimento: string; // '2026-05-10'
  valor_centavos: number;
  pago: number; // 0 ou 1
  pago_em: string | null;
  parcela_numero: number | null;
}

export interface LancamentoComDetalhes extends Lancamento {
  conta_nome: string;
  conta_tipo: TipoConta;
  categoria_id: number;
  categoria_nome: string;
  categoria_cor: string;
  categoria_icone: string;
  compartilhada: number;
  sem_vencimento: number;
  parcelas_total: number | null;
  minha_parte_centavos?: number;
}

export type TipoRenda = 'fixa' | 'variavel' | 'pontual';

export interface Renda {
  id: number;
  nome: string;
  valor_centavos: number;
  dia_recebimento: number; // 1-31
  tipo: TipoRenda;
  mes_ref: string | null; // só para 'pontual': '2026-12'
  ativa: number; // 0 ou 1
  criado_em: string;
}

/**
 * Renda como vale em um mês específico: valor_centavos já é o valor do mês
 * (o recebido, se marcada como recebida; senão o previsto).
 */
export interface RendaDoMes extends Renda {
  valor_previsto_centavos: number;
  recebida: boolean;
}

export interface RendaRecebida {
  id: number;
  renda_id: number;
  mes_ref: string; // '2026-05'
  valor_centavos: number;
  recebida_em: string;
}

export interface ReservaMeta {
  id: number;
  valor_meta_centavos: number;
  tipo_meta?: 'fixo' | 'meses_gastos';
  meses_gastos?: number;
}

export interface ReservaAporte {
  id: number;
  valor_centavos: number; // positivo aporte, negativo retirada
  data: string; // '2026-05-10'
  observacao: string | null;
}

export interface Pessoa {
  id: number;
  nome: string;
}

export interface Divisao {
  id: number;
  lancamento_id: number;
  pessoa_id: number;
  valor_centavos: number;
  pago: number; // 0 ou 1
  pessoa_nome?: string;
}

export type SituacaoConta = 'atrasada' | 'esta_semana' | 'mais_adiante' | 'paga';

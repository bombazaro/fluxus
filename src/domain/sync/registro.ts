import { CONFIGURACOES_DO_APARELHO } from '@/src/db/rastreioDeMudancas';

export type TabelaSync =
  | 'categorias'
  | 'pessoas'
  | 'contas'
  | 'lancamentos'
  | 'lancamentos_ignorados'
  | 'divisoes'
  | 'rendas'
  | 'rendas_recebidas'
  | 'reserva_meta'
  | 'reserva_aportes'
  | 'configuracoes';

export type Valor = string | number | null;

/** Uma linha como ela viaja para o servidor: sem ids locais, com pais pelo uid. */
export interface Registro {
  tabela: TabelaSync;
  uid: string;
  /** Nulo quando a linha foi excluída. */
  dados: Record<string, Valor> | null;
  atualizadoEm: string;
  excluidoEm: string | null;
}

export interface DefinicaoTabela {
  tabela: TabelaSync;
  /** Colunas comuns, que viajam como estão. */
  colunas: string[];
  /** Coluna de chave estrangeira → tabela do pai. Viaja como `<nome>_uid`. */
  pais: Record<string, TabelaSync>;
}

/** Pais sempre antes dos filhos: é a ordem de envio e de aplicação. */
export const TABELAS_SYNC: DefinicaoTabela[] = [
  { tabela: 'categorias', colunas: ['nome', 'cor', 'icone'], pais: {} },
  { tabela: 'pessoas', colunas: ['nome'], pais: {} },
  {
    tabela: 'contas',
    colunas: [
      'nome',
      'tipo',
      'valor_centavos',
      'dia_vencimento',
      'data_unica',
      'parcelas_total',
      'data_inicio',
      'data_fim',
      'ativa',
      'compartilhada',
      'sem_vencimento',
      'criado_em',
    ],
    pais: { categoria_id: 'categorias' },
  },
  {
    tabela: 'lancamentos',
    colunas: ['mes_ref', 'vencimento', 'valor_centavos', 'pago', 'pago_em', 'parcela_numero'],
    pais: { conta_id: 'contas' },
  },
  { tabela: 'lancamentos_ignorados', colunas: ['mes_ref'], pais: { conta_id: 'contas' } },
  {
    tabela: 'divisoes',
    colunas: ['valor_centavos', 'pago'],
    pais: { lancamento_id: 'lancamentos', pessoa_id: 'pessoas' },
  },
  {
    tabela: 'rendas',
    colunas: ['nome', 'valor_centavos', 'dia_recebimento', 'tipo', 'mes_ref', 'ativa', 'criado_em'],
    pais: {},
  },
  {
    tabela: 'rendas_recebidas',
    colunas: ['mes_ref', 'valor_centavos', 'recebida_em'],
    pais: { renda_id: 'rendas' },
  },
  {
    tabela: 'reserva_meta',
    colunas: ['valor_meta_centavos', 'tipo_meta', 'meses_gastos'],
    pais: {},
  },
  { tabela: 'reserva_aportes', colunas: ['valor_centavos', 'data', 'observacao'], pais: {} },
  { tabela: 'configuracoes', colunas: ['valor'], pais: {} },
];

export function definicaoDe(tabela: TabelaSync): DefinicaoTabela {
  const def = TABELAS_SYNC.find((d) => d.tabela === tabela);
  if (!def) throw new Error(`Tabela desconhecida: ${tabela}`);
  return def;
}

const nomeDoUid = (coluna: string) => coluna.replace(/_id$/, '_uid');

export type UidDoPai = (tabela: TabelaSync, id: number) => string | null;
export type IdDoPai = (tabela: TabelaSync, uid: string) => number | null;

export type LinhaLocal = Record<string, Valor | undefined>;

function ehDoAparelho(chave: string): boolean {
  return (CONFIGURACOES_DO_APARELHO as readonly string[]).includes(chave);
}

/** Converte uma linha do banco local no formato que vai para o servidor. */
export function paraRegistro(
  def: DefinicaoTabela,
  linha: LinhaLocal,
  uidDoPai: UidDoPai
): Registro {
  const atualizadoEm = String(linha.atualizado_em);
  const dados: Record<string, Valor> = {};
  for (const c of def.colunas) dados[c] = linha[c] ?? null;

  if (def.tabela === 'configuracoes') {
    const chave = String(linha.chave);
    if (ehDoAparelho(chave)) {
      throw new Error(`A configuração ${chave} vale só para este aparelho.`);
    }
    return { tabela: def.tabela, uid: chave, dados, atualizadoEm, excluidoEm: null };
  }

  for (const [coluna, tabelaPai] of Object.entries(def.pais)) {
    const id = linha[coluna];
    const uid = typeof id === 'number' ? uidDoPai(tabelaPai, id) : null;
    if (uid === null) {
      throw new Error(`${def.tabela}: o pai ${tabelaPai} (${String(id)}) não tem uid.`);
    }
    dados[nomeDoUid(coluna)] = uid;
  }
  return { tabela: def.tabela, uid: String(linha.uid), dados, atualizadoEm, excluidoEm: null };
}

export function registroExcluido(tabela: TabelaSync, uid: string, excluidoEm: string): Registro {
  return { tabela, uid, dados: null, atualizadoEm: excluidoEm, excluidoEm };
}

export type ResultadoLinha =
  | { status: 'ok'; valores: Record<string, Valor> }
  | { status: 'pai-ausente'; pai: { tabela: TabelaSync; uid: string } }
  | { status: 'ignorada' };

/** Converte um registro do servidor em valores prontos para gravar no banco local. */
export function paraLinha(
  def: DefinicaoTabela,
  registro: Registro,
  idDoPai: IdDoPai
): ResultadoLinha {
  const dados = registro.dados ?? {};
  if (def.tabela === 'configuracoes') {
    if (ehDoAparelho(registro.uid)) return { status: 'ignorada' };
    return { status: 'ok', valores: { chave: registro.uid, valor: dados.valor ?? '' } };
  }

  const valores: Record<string, Valor> = {};
  for (const c of def.colunas) valores[c] = dados[c] ?? null;
  for (const [coluna, tabelaPai] of Object.entries(def.pais)) {
    const uid = dados[nomeDoUid(coluna)];
    if (typeof uid !== 'string') return { status: 'ignorada' };
    const id = idDoPai(tabelaPai, uid);
    if (id === null) return { status: 'pai-ausente', pai: { tabela: tabelaPai, uid } };
    valores[coluna] = id;
  }
  return { status: 'ok', valores };
}

/** Texto estável do conteúdo, para saber se duas versões com a mesma data são iguais. */
export function assinaturaDe(dados: Record<string, Valor> | null): string {
  if (dados === null) return 'excluida';
  const ordenado: Record<string, Valor> = {};
  for (const k of Object.keys(dados).sort()) ordenado[k] = dados[k];
  return JSON.stringify(ordenado);
}

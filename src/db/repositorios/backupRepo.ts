import { SQLiteDatabase } from 'expo-sqlite';
import { atribuirUidsFixos } from '@/src/db/rastreioDeMudancas';
import { BackupFluxus, LinhaBackup, ValorColuna } from '@/src/domain/backup';

/** Limite antigo do SQLite é 999 parâmetros por instrução; fica abaixo dele. */
const LIMITE_VARIAVEIS = 900;

/**
 * Tabelas do backup, dos "pais" para os "filhos" (ordem das chaves estrangeiras),
 * com as colunas permitidas. Só essas colunas são lidas do arquivo importado,
 * para nenhum nome vindo do arquivo ir parar no SQL.
 * `padroes` preenche colunas NOT NULL que não existiam em versões antigas do banco.
 */
const TABELAS: { nome: string; colunas: string[]; padroes?: Record<string, ValorColuna> }[] = [
  { nome: 'categorias', colunas: ['id', 'nome', 'cor', 'icone'] },
  { nome: 'pessoas', colunas: ['id', 'nome'] },
  {
    nome: 'contas',
    colunas: [
      'id',
      'nome',
      'categoria_id',
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
    padroes: { sem_vencimento: 0 },
  },
  {
    nome: 'lancamentos',
    colunas: [
      'id',
      'conta_id',
      'mes_ref',
      'vencimento',
      'valor_centavos',
      'pago',
      'pago_em',
      'parcela_numero',
    ],
  },
  { nome: 'lancamentos_ignorados', colunas: ['conta_id', 'mes_ref'] },
  {
    nome: 'divisoes',
    colunas: ['id', 'lancamento_id', 'pessoa_id', 'valor_centavos', 'pago'],
  },
  {
    nome: 'rendas',
    colunas: [
      'id',
      'nome',
      'valor_centavos',
      'dia_recebimento',
      'tipo',
      'mes_ref',
      'ativa',
      'criado_em',
    ],
  },
  {
    nome: 'rendas_recebidas',
    colunas: ['id', 'renda_id', 'mes_ref', 'valor_centavos', 'recebida_em'],
  },
  { nome: 'reserva_meta', colunas: ['id', 'valor_meta_centavos', 'tipo_meta', 'meses_gastos'] },
  { nome: 'reserva_aportes', colunas: ['id', 'valor_centavos', 'data', 'observacao'] },
  { nome: 'configuracoes', colunas: ['chave', 'valor'] },
];

export const backupRepo = {
  async exportarTudo(db: SQLiteDatabase, versaoBanco: number): Promise<BackupFluxus> {
    const tabelas: Record<string, LinhaBackup[]> = {};
    for (const { nome, colunas } of TABELAS) {
      tabelas[nome] = await db.getAllAsync<LinhaBackup>(
        `SELECT ${colunas.join(', ')} FROM ${nome};`
      );
    }
    return {
      app: 'fluxus',
      versaoBanco,
      exportadoEm: new Date().toISOString(),
      tabelas,
    };
  },

  /**
   * Substitui TODOS os dados do app pelos do backup, numa transação:
   * se qualquer linha falhar, nada muda.
   * Colunas que faltam no backup (versão antiga do banco) entram como nulas.
   */
  async importarTudo(db: SQLiteDatabase, backup: BackupFluxus): Promise<void> {
    await db.withTransactionAsync(async () => {
      for (const { nome } of [...TABELAS].reverse()) {
        await db.runAsync(`DELETE FROM ${nome};`);
      }

      for (const { nome, colunas, padroes } of TABELAS) {
        const linhas = backup.tabelas[nome] ?? [];
        // Várias linhas por INSERT: cada chamada ao banco tem um custo fixo no celular e no
        // navegador, e um backup grande tem milhares de lançamentos.
        const porLote = Math.max(1, Math.floor(LIMITE_VARIAVEIS / colunas.length));
        const grupo = `(${colunas.map(() => '?').join(', ')})`;
        for (let i = 0; i < linhas.length; i += porLote) {
          const lote = linhas.slice(i, i + porLote);
          const valores: ValorColuna[] = lote.flatMap((linha) =>
            colunas.map((c) => linha[c] ?? padroes?.[c] ?? null)
          );
          await db.runAsync(
            `INSERT INTO ${nome} (${colunas.join(', ')}) VALUES ${lote.map(() => grupo).join(', ')};`,
            valores
          );
        }
      }
      // as linhas voltaram com uid novo: refaz a identidade fixa das de fábrica
      await atribuirUidsFixos(db);
    });
  },
};

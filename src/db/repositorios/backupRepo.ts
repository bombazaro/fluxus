import { SQLiteDatabase } from 'expo-sqlite';
import { BackupFluxus, LinhaBackup, ValorColuna } from '@/src/domain/backup';

/**
 * Tabelas do backup, dos "pais" para os "filhos" (ordem das chaves estrangeiras),
 * com as colunas permitidas. Só essas colunas são lidas do arquivo importado,
 * para nenhum nome vindo do arquivo ir parar no SQL.
 */
const TABELAS: { nome: string; colunas: string[] }[] = [
  { nome: 'categorias', colunas: ['id', 'nome', 'cor', 'icone'] },
  { nome: 'pessoas', colunas: ['id', 'nome'] },
  {
    nome: 'contas',
    colunas: [
      'id', 'nome', 'categoria_id', 'tipo', 'valor_centavos', 'dia_vencimento', 'data_unica',
      'parcelas_total', 'data_inicio', 'data_fim', 'ativa', 'compartilhada', 'criado_em',
    ],
  },
  {
    nome: 'lancamentos',
    colunas: [
      'id', 'conta_id', 'mes_ref', 'vencimento', 'valor_centavos', 'pago', 'pago_em',
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
      'id', 'nome', 'valor_centavos', 'dia_recebimento', 'tipo', 'mes_ref', 'ativa', 'criado_em',
    ],
  },
  {
    nome: 'rendas_recebidas',
    colunas: ['id', 'renda_id', 'mes_ref', 'valor_centavos', 'recebida_em'],
  },
  { nome: 'reserva_meta', colunas: ['id', 'valor_meta_centavos', 'tipo_meta', 'meses_gastos'] },
  { nome: 'reserva_aportes', colunas: ['id', 'valor_centavos', 'data', 'observacao'] },
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

      for (const { nome, colunas } of TABELAS) {
        const marcadores = colunas.map(() => '?').join(', ');
        const sql = `INSERT INTO ${nome} (${colunas.join(', ')}) VALUES (${marcadores});`;
        for (const linha of backup.tabelas[nome] ?? []) {
          const valores: ValorColuna[] = colunas.map((c) => linha[c] ?? null);
          await db.runAsync(sql, valores);
        }
      }
    });
  },
};

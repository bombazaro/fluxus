import { SQLiteDatabase } from 'expo-sqlite';
import { Divisao } from '@/src/types';

export const divisoesRepo = {
  /**
   * Troca as divisões de um lançamento. Não abre transação própria:
   * quem chama deve envolver em withTransactionAsync (não dá para aninhar).
   */
  async salvarDivisoes(
    db: SQLiteDatabase,
    lancamentoId: number,
    divisoes: { pessoa_id: number; valor_centavos: number }[]
  ): Promise<void> {
    await db.runAsync('DELETE FROM divisoes WHERE lancamento_id = ?;', [
      lancamentoId,
    ]);
    for (const d of divisoes) {
      await db.runAsync(
        'INSERT INTO divisoes (lancamento_id, pessoa_id, valor_centavos, pago) VALUES (?, ?, ?, 0);',
        [lancamentoId, d.pessoa_id, d.valor_centavos]
      );
    }
  },

  async listarPorLancamento(
    db: SQLiteDatabase,
    lancamentoId: number
  ): Promise<Divisao[]> {
    return await db.getAllAsync<Divisao>(
      `SELECT d.id, d.lancamento_id, d.pessoa_id, d.valor_centavos, d.pago, p.nome as pessoa_nome
       FROM divisoes d
       INNER JOIN pessoas p ON p.id = d.pessoa_id
       WHERE d.lancamento_id = ?
       ORDER BY d.id ASC;`,
      [lancamentoId]
    );
  },

  async listarPorMes(
    db: SQLiteDatabase,
    mesRef: string
  ): Promise<Divisao[]> {
    return await db.getAllAsync<Divisao>(
      `SELECT d.id, d.lancamento_id, d.pessoa_id, d.valor_centavos, d.pago, p.nome as pessoa_nome
       FROM divisoes d
       INNER JOIN lancamentos l ON l.id = d.lancamento_id
       INNER JOIN pessoas p ON p.id = d.pessoa_id
       WHERE l.mes_ref = ?
       ORDER BY d.id ASC;`,
      [mesRef]
    );
  },

  async marcarPaga(
    db: SQLiteDatabase,
    divisaoId: number,
    pago: boolean
  ): Promise<void> {
    await db.runAsync('UPDATE divisoes SET pago = ? WHERE id = ?;', [
      pago ? 1 : 0,
      divisaoId,
    ]);
  },

  async obterAcertosPorPessoa(db: SQLiteDatabase): Promise<
    {
      pessoa_id: number;
      pessoa_nome: string;
      total_devido_centavos: number;
      total_pago_centavos: number;
      saldo_centavos: number;
    }[]
  > {
    return await db.getAllAsync<{
      pessoa_id: number;
      pessoa_nome: string;
      total_devido_centavos: number;
      total_pago_centavos: number;
      saldo_centavos: number;
    }>(
      `SELECT
        p.id AS pessoa_id,
        p.nome AS pessoa_nome,
        COALESCE(SUM(CASE WHEN d.pago = 0 THEN d.valor_centavos ELSE 0 END), 0) AS total_devido_centavos,
        COALESCE(SUM(CASE WHEN d.pago = 1 THEN d.valor_centavos ELSE 0 END), 0) AS total_pago_centavos,
        COALESCE(SUM(CASE WHEN d.pago = 0 THEN d.valor_centavos ELSE 0 END), 0) AS saldo_centavos
      FROM pessoas p
      LEFT JOIN divisoes d ON d.pessoa_id = p.id
      WHERE p.nome != 'Eu'
      GROUP BY p.id, p.nome
      ORDER BY p.nome ASC;`
    );
  },
};

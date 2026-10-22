import { SQLiteDatabase } from 'expo-sqlite';
import { Divisao } from '@/src/types';
import { LinhaAcerto } from '@/src/domain/acertos';

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
    await db.runAsync('DELETE FROM divisoes WHERE lancamento_id = ?;', [lancamentoId]);
    for (const d of divisoes) {
      await db.runAsync(
        'INSERT INTO divisoes (lancamento_id, pessoa_id, valor_centavos, pago) VALUES (?, ?, ?, 0);',
        [lancamentoId, d.pessoa_id, d.valor_centavos]
      );
    }
  },

  async listarPorLancamento(db: SQLiteDatabase, lancamentoId: number): Promise<Divisao[]> {
    return await db.getAllAsync<Divisao>(
      `SELECT d.id, d.lancamento_id, d.pessoa_id, d.valor_centavos, d.pago, p.nome as pessoa_nome
       FROM divisoes d
       INNER JOIN pessoas p ON p.id = d.pessoa_id
       WHERE d.lancamento_id = ?
       ORDER BY d.id ASC;`,
      [lancamentoId]
    );
  },

  async listarPorMes(db: SQLiteDatabase, mesRef: string): Promise<Divisao[]> {
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

  /**
   * Partes de outras pessoas ainda não acertadas, em contas até o mês informado
   * (parcelas de meses futuros ainda não são devidas).
   */
  async listarAcertosPendentes(db: SQLiteDatabase, ateMesRef: string): Promise<LinhaAcerto[]> {
    return await db.getAllAsync<LinhaAcerto>(
      `SELECT d.id AS divisao_id, d.pessoa_id, p.nome AS pessoa_nome, c.nome AS conta_nome,
         l.mes_ref, d.valor_centavos
       FROM divisoes d
       INNER JOIN pessoas p ON p.id = d.pessoa_id
       INNER JOIN lancamentos l ON l.id = d.lancamento_id
       INNER JOIN contas c ON c.id = l.conta_id
       WHERE p.nome != 'Eu' AND d.pago = 0 AND d.valor_centavos > 0 AND l.mes_ref <= ?
       ORDER BY l.mes_ref ASC, d.id ASC;`,
      [ateMesRef]
    );
  },

  /** Marca partes como acertadas (a pessoa já pagou a parte dela). */
  async marcarAcertadas(db: SQLiteDatabase, divisaoIds: number[]): Promise<void> {
    if (divisaoIds.length === 0) return;
    const marcadores = divisaoIds.map(() => '?').join(', ');
    await db.runAsync(`UPDATE divisoes SET pago = 1 WHERE id IN (${marcadores});`, divisaoIds);
  },
};

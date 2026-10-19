import { SQLiteDatabase } from 'expo-sqlite';
import { Conta } from '@/src/types';

export const contasRepo = {
  async criar(
    db: SQLiteDatabase,
    conta: Omit<Conta, 'id' | 'criado_em'>
  ): Promise<number> {
    const criadoEm = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO contas (
        nome, categoria_id, tipo, valor_centavos, dia_vencimento,
        data_unica, parcelas_total, data_inicio, data_fim, ativa,
        compartilhada, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        conta.nome,
        conta.categoria_id,
        conta.tipo,
        conta.valor_centavos,
        conta.dia_vencimento,
        conta.data_unica,
        conta.parcelas_total,
        conta.data_inicio,
        conta.data_fim,
        conta.ativa,
        conta.compartilhada,
        criadoEm,
      ]
    );
    return result.lastInsertRowId;
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Conta | null> {
    const row = await db.getFirstAsync<Conta>(
      'SELECT * FROM contas WHERE id = ?;',
      [id]
    );
    return row || null;
  },

  async listarAtivas(db: SQLiteDatabase): Promise<Conta[]> {
    return await db.getAllAsync<Conta>(
      'SELECT * FROM contas WHERE ativa = 1 ORDER BY nome ASC;'
    );
  },

  async listarTodas(db: SQLiteDatabase): Promise<Conta[]> {
    return await db.getAllAsync<Conta>(
      'SELECT * FROM contas ORDER BY ativa DESC, nome ASC;'
    );
  },

  async atualizar(
    db: SQLiteDatabase,
    id: number,
    dados: Partial<Omit<Conta, 'id' | 'criado_em'>>
  ): Promise<void> {
    const chaves = Object.keys(dados) as (keyof typeof dados)[];
    if (chaves.length === 0) return;

    const setClauses = chaves.map((k) => `${String(k)} = ?`).join(', ');
    const valores = chaves.map((k) => (dados[k] === undefined ? null : dados[k]));

    await db.runAsync(
      `UPDATE contas SET ${setClauses} WHERE id = ?;`,
      ...[...valores, id] as (string | number | null)[]
    );
  },

  async desativar(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('UPDATE contas SET ativa = 0 WHERE id = ?;', [id]);
  },

  async excluir(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM contas WHERE id = ?;', [id]);
  },
};

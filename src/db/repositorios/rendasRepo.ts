import { SQLiteDatabase } from 'expo-sqlite';
import { Renda, RendaRecebida } from '@/src/types';

export const rendasRepo = {
  async criar(
    db: SQLiteDatabase,
    renda: Omit<Renda, 'id' | 'criado_em'>
  ): Promise<number> {
    const criadoEm = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO rendas (
        nome, valor_centavos, dia_recebimento, tipo, ativa, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?);`,
      [
        renda.nome,
        renda.valor_centavos,
        renda.dia_recebimento,
        renda.tipo || 'fixa',
        renda.ativa ? 1 : 0,
        criadoEm,
      ]
    );
    return result.lastInsertRowId;
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Renda | null> {
    const row = await db.getFirstAsync<Renda>(
      'SELECT * FROM rendas WHERE id = ?;',
      [id]
    );
    return row || null;
  },

  async listarAtivas(db: SQLiteDatabase): Promise<Renda[]> {
    return await db.getAllAsync<Renda>(
      'SELECT * FROM rendas WHERE ativa = 1 ORDER BY dia_recebimento ASC;'
    );
  },

  async listarTodas(db: SQLiteDatabase): Promise<Renda[]> {
    return await db.getAllAsync<Renda>(
      'SELECT * FROM rendas ORDER BY ativa DESC, dia_recebimento ASC;'
    );
  },

  async atualizar(
    db: SQLiteDatabase,
    id: number,
    dados: Partial<Omit<Renda, 'id' | 'criado_em'>>
  ): Promise<void> {
    const chaves = Object.keys(dados) as (keyof typeof dados)[];
    if (chaves.length === 0) return;

    const setClauses = chaves.map((k) => `${String(k)} = ?`).join(', ');
    const valores = chaves.map((k) => (dados[k] === undefined ? null : dados[k]));

    await db.runAsync(
      `UPDATE rendas SET ${setClauses} WHERE id = ?;`,
      ...[...valores, id] as (string | number | null)[]
    );
  },

  async desativar(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('UPDATE rendas SET ativa = 0 WHERE id = ?;', [id]);
  },

  async excluir(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM rendas WHERE id = ?;', [id]);
  },

  async marcarRecebida(
    db: SQLiteDatabase,
    rendaId: number,
    mesRef: string,
    valorCentavos: number
  ): Promise<void> {
    const recebidaEm = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO rendas_recebidas (renda_id, mes_ref, valor_centavos, recebida_em)
       VALUES (?, ?, ?, ?)
       ON CONFLICT DO NOTHING;`,
      [rendaId, mesRef, valorCentavos, recebidaEm]
    );
  },

  async desmarcarRecebida(
    db: SQLiteDatabase,
    rendaId: number,
    mesRef: string
  ): Promise<void> {
    await db.runAsync(
      'DELETE FROM rendas_recebidas WHERE renda_id = ? AND mes_ref = ?;',
      [rendaId, mesRef]
    );
  },

  async listarRecebidasDoMes(
    db: SQLiteDatabase,
    mesRef: string
  ): Promise<RendaRecebida[]> {
    return await db.getAllAsync<RendaRecebida>(
      'SELECT * FROM rendas_recebidas WHERE mes_ref = ?;',
      [mesRef]
    );
  },
};

import { SQLiteDatabase } from 'expo-sqlite';
import { Pessoa } from '@/src/types';

export const pessoasRepo = {
  async listarTodas(db: SQLiteDatabase): Promise<Pessoa[]> {
    return await db.getAllAsync<Pessoa>('SELECT * FROM pessoas ORDER BY id ASC;');
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Pessoa | null> {
    const row = await db.getFirstAsync<Pessoa>(
      'SELECT * FROM pessoas WHERE id = ?;',
      [id]
    );
    return row || null;
  },

  async criar(db: SQLiteDatabase, nome: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO pessoas (nome) VALUES (?);', [
      nome,
    ]);
    return result.lastInsertRowId;
  },

  async renomear(db: SQLiteDatabase, id: number, nome: string): Promise<void> {
    await db.runAsync("UPDATE pessoas SET nome = ? WHERE id = ? AND nome != 'Eu';", [nome, id]);
  },

  /** Em quantas divisões de contas a pessoa aparece (some ao excluir a pessoa). */
  async contarDivisoes(db: SQLiteDatabase, id: number): Promise<number> {
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM divisoes WHERE pessoa_id = ?;',
      [id]
    );
    return row?.total ?? 0;
  },

  /** "Eu" nunca é excluído: é como o app sabe qual é a parte do usuário. */
  async excluir(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync("DELETE FROM pessoas WHERE id = ? AND nome != 'Eu';", [id]);
  },
};

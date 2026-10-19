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

  async excluir(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM pessoas WHERE id = ?;', [id]);
  },
};

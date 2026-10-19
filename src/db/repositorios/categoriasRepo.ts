import { SQLiteDatabase } from 'expo-sqlite';
import { Categoria } from '@/src/types';

export const categoriasRepo = {
  async listarTodas(db: SQLiteDatabase): Promise<Categoria[]> {
    return await db.getAllAsync<Categoria>(
      'SELECT * FROM categorias ORDER BY nome ASC;'
    );
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Categoria | null> {
    const row = await db.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ?;',
      [id]
    );
    return row || null;
  },

  async criar(
    db: SQLiteDatabase,
    cat: Omit<Categoria, 'id'>
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO categorias (nome, cor, icone) VALUES (?, ?, ?);',
      [cat.nome, cat.cor, cat.icone]
    );
    return result.lastInsertRowId;
  },
};

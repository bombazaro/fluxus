import Database from 'better-sqlite3';
import { SQLiteDatabase } from 'expo-sqlite';
import { executarMigracoes } from '../../src/db/migrations';

type Parametro = string | number | null;

function normalizar(params: unknown[]): Parametro[] {
  if (params.length === 1 && Array.isArray(params[0])) return params[0] as Parametro[];
  return params as Parametro[];
}

/**
 * Banco SQLite em memória que imita a parte da API do expo-sqlite usada pelo app
 * (execAsync, runAsync, getFirstAsync, getAllAsync, withTransactionAsync).
 * Permite testar repositórios e migrações com SQL de verdade, sem celular.
 */
export function criarBancoVazio(): SQLiteDatabase {
  const banco = new Database(':memory:');

  const adaptador = {
    async execAsync(sql: string) {
      banco.exec(sql);
    },
    async runAsync(sql: string, ...params: unknown[]) {
      const r = banco.prepare(sql).run(...normalizar(params));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
    },
    async getFirstAsync(sql: string, ...params: unknown[]) {
      return banco.prepare(sql).get(...normalizar(params)) ?? null;
    },
    async getAllAsync(sql: string, ...params: unknown[]) {
      return banco.prepare(sql).all(...normalizar(params));
    },
    async withTransactionAsync(tarefa: () => Promise<void>) {
      banco.exec('BEGIN;');
      try {
        await tarefa();
        banco.exec('COMMIT;');
      } catch (err) {
        banco.exec('ROLLBACK;');
        throw err;
      }
    },
  };

  return adaptador as unknown as SQLiteDatabase;
}

/** Banco em memória já com todas as migrações aplicadas, como no primeiro uso do app. */
export async function criarBanco(): Promise<SQLiteDatabase> {
  const db = criarBancoVazio();
  await executarMigracoes(db);
  return db;
}

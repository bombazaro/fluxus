import { SQLiteDatabase } from 'expo-sqlite';
import { CATEGORIAS_PADRAO, SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from './schema';

export const VERSAO_BANCO = 4;

export async function executarMigracoes(db: SQLiteDatabase): Promise<void> {
  // Ativa chaves estrangeiras
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const res = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const versaoAtual = res?.user_version ?? 0;

  if (versaoAtual < 1) {
    await db.withTransactionAsync(async () => {
      // Criação inicial das tabelas
      await db.execAsync(SCHEMA_V1);

      // Inserção das categorias padrão se estiver vazio
      const catCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM categorias;'
      );

      if (!catCount || catCount.count === 0) {
        for (const cat of CATEGORIAS_PADRAO) {
          await db.runAsync('INSERT INTO categorias (nome, cor, icone) VALUES (?, ?, ?);', [
            cat.nome,
            cat.cor,
            cat.icone,
          ]);
        }
      }

      // Inserção da pessoa padrão "Eu" se estiver vazio
      const pessoaCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM pessoas;'
      );

      if (!pessoaCount || pessoaCount.count === 0) {
        await db.runAsync('INSERT INTO pessoas (nome) VALUES (?);', ['Eu']);
      }

      await db.execAsync('PRAGMA user_version = 1;');
    });
  }

  if (versaoAtual < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V2);
      await db.execAsync('PRAGMA user_version = 2;');
    });
  }

  if (versaoAtual < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V3);
      await db.execAsync('PRAGMA user_version = 3;');
    });
  }

  if (versaoAtual < 4) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V4);
      await db.execAsync(`PRAGMA user_version = ${VERSAO_BANCO};`);
    });
  }
}

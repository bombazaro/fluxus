import { SQLiteDatabase } from 'expo-sqlite';
import {
  Configuracoes,
  lerConfiguracoes,
  serializarConfiguracoes,
} from '@/src/domain/configuracoes';

export const configuracoesRepo = {
  async obter(db: SQLiteDatabase): Promise<Configuracoes> {
    const linhas = await db.getAllAsync<{ chave: string; valor: string }>(
      'SELECT chave, valor FROM configuracoes;'
    );
    return lerConfiguracoes(linhas);
  },

  async salvar(db: SQLiteDatabase, parcial: Partial<Configuracoes>): Promise<void> {
    await db.withTransactionAsync(async () => {
      for (const { chave, valor } of serializarConfiguracoes(parcial)) {
        await db.runAsync(
          `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
           ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor;`,
          [chave, valor]
        );
      }
    });
  },
};

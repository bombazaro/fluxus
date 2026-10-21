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

  /** Se já há alguma conta ou renda cadastrada. */
  async temDados(db: SQLiteDatabase): Promise<boolean> {
    const row = await db.getFirstAsync<{ tem: number }>(
      `SELECT EXISTS (SELECT 1 FROM contas) OR EXISTS (SELECT 1 FROM rendas) AS tem;`
    );
    return row?.tem === 1;
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

import { SQLiteDatabase } from 'expo-sqlite';
import { Conta } from '@/src/types';
import { adicionarMeses, ajustarDiaDoMes } from '@/src/domain/gerarLancamentos';

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
        compartilhada, sem_vencimento, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
        conta.sem_vencimento,
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

  /**
   * Exclui a conta "deste mês em diante": apaga os lançamentos não pagos a partir
   * do mês e encerra a conta no mês anterior. O histórico pago é mantido para os
   * meses passados não mudarem. Se não sobrar nenhum lançamento, apaga a conta.
   */
  async encerrarAPartirDe(
    db: SQLiteDatabase,
    id: number,
    mesRef: string
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'DELETE FROM lancamentos WHERE conta_id = ? AND mes_ref >= ? AND pago = 0;',
        [id, mesRef]
      );

      const restantes = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) AS total FROM lancamentos WHERE conta_id = ?;',
        [id]
      );

      if (!restantes || restantes.total === 0) {
        await db.runAsync('DELETE FROM contas WHERE id = ?;', [id]);
        return;
      }

      const [ano, mes] = adicionarMeses(mesRef, -1).split('-').map(Number);
      await db.runAsync('UPDATE contas SET data_fim = ? WHERE id = ?;', [
        ajustarDiaDoMes(ano, mes, 31),
        id,
      ]);
    });
  },
};

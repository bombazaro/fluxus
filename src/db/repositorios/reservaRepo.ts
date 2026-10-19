import { SQLiteDatabase } from 'expo-sqlite';
import { ReservaAporte, ReservaMeta } from '@/src/types';

export const reservaRepo = {
  async obterMeta(db: SQLiteDatabase): Promise<ReservaMeta | null> {
    const row = await db.getFirstAsync<ReservaMeta>(
      'SELECT * FROM reserva_meta ORDER BY id ASC LIMIT 1;'
    );
    return row || null;
  },

  async definirMeta(
    db: SQLiteDatabase,
    valorMetaCentavos: number,
    tipoMeta: 'fixo' | 'meses_gastos' = 'fixo',
    mesesGastos = 6
  ): Promise<void> {
    const metaAtual = await this.obterMeta(db);
    if (metaAtual) {
      await db.runAsync(
        'UPDATE reserva_meta SET valor_meta_centavos = ?, tipo_meta = ?, meses_gastos = ? WHERE id = ?;',
        [valorMetaCentavos, tipoMeta, mesesGastos, metaAtual.id]
      );
    } else {
      await db.runAsync(
        'INSERT INTO reserva_meta (valor_meta_centavos, tipo_meta, meses_gastos) VALUES (?, ?, ?);',
        [valorMetaCentavos, tipoMeta, mesesGastos]
      );
    }
  },

  async listarAportes(db: SQLiteDatabase): Promise<ReservaAporte[]> {
    return await db.getAllAsync<ReservaAporte>(
      'SELECT * FROM reserva_aportes ORDER BY data DESC, id DESC;'
    );
  },

  async adicionarAporte(
    db: SQLiteDatabase,
    valorCentavos: number,
    data: string,
    observacao?: string | null
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO reserva_aportes (valor_centavos, data, observacao) VALUES (?, ?, ?);',
      [valorCentavos, data, observacao ?? null]
    );
    return result.lastInsertRowId;
  },

  async excluirAporte(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM reserva_aportes WHERE id = ?;', [id]);
  },

  async obterTotalGuardado(db: SQLiteDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(valor_centavos) as total FROM reserva_aportes;'
    );
    return row?.total ?? 0;
  },
};

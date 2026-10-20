import { SQLiteDatabase } from 'expo-sqlite';
import { Conta, Lancamento, LancamentoComDetalhes } from '@/src/types';
import { ajustarDiaDoMes } from '@/src/domain/gerarLancamentos';

export const lancamentosRepo = {
  async criar(
    db: SQLiteDatabase,
    lancamento: Omit<Lancamento, 'id'>
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO lancamentos (
        conta_id, mes_ref, vencimento, valor_centavos, pago, pago_em, parcela_numero
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        lancamento.conta_id,
        lancamento.mes_ref,
        lancamento.vencimento,
        lancamento.valor_centavos,
        lancamento.pago ? 1 : 0,
        lancamento.pago_em ?? null,
        lancamento.parcela_numero ?? null,
      ]
    );
    return result.lastInsertRowId;
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Lancamento | null> {
    const row = await db.getFirstAsync<Lancamento>(
      'SELECT * FROM lancamentos WHERE id = ?;',
      [id]
    );
    return row || null;
  },

  async buscarPorContaEMes(
    db: SQLiteDatabase,
    contaId: number,
    mesRef: string
  ): Promise<Lancamento | null> {
    const row = await db.getFirstAsync<Lancamento>(
      'SELECT * FROM lancamentos WHERE conta_id = ? AND mes_ref = ?;',
      [contaId, mesRef]
    );
    return row || null;
  },

  async listarPorMes(
    db: SQLiteDatabase,
    mesRef: string
  ): Promise<LancamentoComDetalhes[]> {
    const rows = await db.getAllAsync<LancamentoComDetalhes>(
      `SELECT
        l.id, l.conta_id, l.mes_ref, l.vencimento, l.valor_centavos, l.pago, l.pago_em, l.parcela_numero,
        c.nome AS conta_nome, c.tipo AS conta_tipo, c.categoria_id, c.compartilhada, c.parcelas_total,
        cat.nome AS categoria_nome, cat.cor AS categoria_cor, cat.icone AS categoria_icone
      FROM lancamentos l
      INNER JOIN contas c ON c.id = l.conta_id
      INNER JOIN categorias cat ON cat.id = c.categoria_id
      WHERE l.mes_ref = ?
      ORDER BY l.vencimento ASC, l.id ASC;`,
      [mesRef]
    );
    return rows;
  },

  async listarPorConta(db: SQLiteDatabase, contaId: number): Promise<Lancamento[]> {
    return await db.getAllAsync<Lancamento>(
      'SELECT * FROM lancamentos WHERE conta_id = ? ORDER BY mes_ref ASC;',
      [contaId]
    );
  },

  async listarPagosDaConta(
    db: SQLiteDatabase,
    contaId: number,
    limite = 6
  ): Promise<Lancamento[]> {
    return await db.getAllAsync<Lancamento>(
      `SELECT * FROM lancamentos
       WHERE conta_id = ? AND pago = 1
       ORDER BY mes_ref DESC
       LIMIT ?;`,
      [contaId, limite]
    );
  },

  async marcarPago(
    db: SQLiteDatabase,
    id: number,
    pago: boolean
  ): Promise<void> {
    const pagoEm = pago ? new Date().toISOString() : null;
    await db.runAsync(
      'UPDATE lancamentos SET pago = ?, pago_em = ? WHERE id = ?;',
      [pago ? 1 : 0, pagoEm, id]
    );
  },

  async atualizarValor(
    db: SQLiteDatabase,
    id: number,
    valorCentavos: number
  ): Promise<void> {
    await db.runAsync(
      'UPDATE lancamentos SET valor_centavos = ? WHERE id = ?;',
      [valorCentavos, id]
    );
  },

  async atualizarVencimento(
    db: SQLiteDatabase,
    id: number,
    vencimento: string
  ): Promise<void> {
    await db.runAsync(
      'UPDATE lancamentos SET vencimento = ? WHERE id = ?;',
      [vencimento, id]
    );
  },

  async excluir(db: SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM lancamentos WHERE id = ?;', [id]);
  },

  async excluirFuturosDaConta(
    db: SQLiteDatabase,
    contaId: number,
    mesRefApartirDe: string
  ): Promise<void> {
    await db.runAsync(
      'DELETE FROM lancamentos WHERE conta_id = ? AND mes_ref >= ? AND pago = 0;',
      [contaId, mesRefApartirDe]
    );
  },

  /**
   * Garante que todas as contas fixas e variáveis ativas possuam lançamento no mês informado.
   * É idempotente: só insere se o lançamento daquele mês ainda não existir
   * e se o mês não foi excluído com "só este mês" (lancamentos_ignorados).
   */
  async garantirMes(db: SQLiteDatabase, mesRef: string): Promise<void> {
    const [anoStr, mesStr] = mesRef.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);

    const contas = await db.getAllAsync<Conta>(
      `SELECT c.* FROM contas c
       WHERE c.ativa = 1
         AND c.tipo IN ('fixa', 'variavel')
         AND c.data_inicio <= ?
         AND (c.data_fim IS NULL OR c.data_fim >= ?)
         AND NOT EXISTS (
           SELECT 1 FROM lancamentos l WHERE l.conta_id = c.id AND l.mes_ref = ?
         )
         AND NOT EXISTS (
           SELECT 1 FROM lancamentos_ignorados i WHERE i.conta_id = c.id AND i.mes_ref = ?
         );`,
      [`${mesRef}-31`, `${mesRef}-01`, mesRef, mesRef]
    );

    for (const c of contas) {
      const vencimento = ajustarDiaDoMes(ano, mes, c.dia_vencimento || 1);
      await db.runAsync(
        `INSERT INTO lancamentos (
          conta_id, mes_ref, vencimento, valor_centavos, pago, pago_em, parcela_numero
        ) VALUES (?, ?, ?, ?, 0, NULL, NULL);`,
        [c.id, mesRef, vencimento, c.valor_centavos]
      );
    }
  },

  /**
   * Exclui só o lançamento deste mês e registra o mês como ignorado,
   * para o garantirMes não recriar a cobrança de contas fixas e variáveis.
   */
  async excluirSoDesteMes(db: SQLiteDatabase, lancamento: Lancamento): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM lancamentos WHERE id = ?;', [lancamento.id]);
      await db.runAsync(
        'INSERT OR IGNORE INTO lancamentos_ignorados (conta_id, mes_ref) VALUES (?, ?);',
        [lancamento.conta_id, lancamento.mes_ref]
      );
    });
  },
};

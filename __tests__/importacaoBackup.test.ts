import { criarBanco } from './helpers/bancoEmMemoria';
import { backupRepo } from '../src/db/repositorios/backupRepo';
import { VERSAO_BACKUP } from '../src/domain/backup';

const TOTAL_CONTAS = 40;
const MESES = 60;

async function bancoComMuitosLancamentos() {
  const db = await criarBanco();
  const cat = (await db.getFirstAsync<{ id: number }>('SELECT id FROM categorias LIMIT 1'))!.id;
  await db.withTransactionAsync(async () => {
    for (let c = 0; c < TOTAL_CONTAS; c++) {
      const r = await db.runAsync(
        `INSERT INTO contas (nome, tipo, valor_centavos, dia_vencimento, categoria_id, ativa,
                             data_inicio, criado_em)
         VALUES (?, 'fixa', ?, 5, ?, 1, '2026-01', '2026-01-01');`,
        [`Conta ${c}`, 1000 + c, cat]
      );
      for (let m = 0; m < MESES; m++) {
        const mes = `${2026 + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;
        await db.runAsync(
          `INSERT INTO lancamentos (conta_id, mes_ref, vencimento, valor_centavos, pago)
           VALUES (?, ?, ?, ?, 0);`,
          [r.lastInsertRowId, mes, `${mes}-05`, 1000 + c]
        );
      }
    }
  });
  return db;
}

describe('importarTudo com muitos dados', () => {
  it('volta idêntico ao que foi exportado', async () => {
    const db = await bancoComMuitosLancamentos();
    const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
    await backupRepo.importarTudo(db, backup);

    const depois = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
    expect(depois.tabelas.lancamentos).toEqual(backup.tabelas.lancamentos);
    expect(depois.tabelas.contas).toEqual(backup.tabelas.contas);
    expect(depois.tabelas.lancamentos).toHaveLength(TOTAL_CONTAS * MESES);
  });

  it('cada linha importada ganha identidade para sincronizar', async () => {
    const db = await bancoComMuitosLancamentos();
    const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
    await backupRepo.importarTudo(db, backup);
    const sem = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM lancamentos WHERE uid IS NULL;'
    );
    const pendentes = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_pendencias WHERE tabela = 'lancamentos';"
    );
    expect(sem?.n).toBe(0);
    expect(pendentes?.n).toBe(TOTAL_CONTAS * MESES);
  });

  it('grava em lotes, não uma chamada por linha', async () => {
    const db = await bancoComMuitosLancamentos();
    const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
    const original = db.runAsync.bind(db);
    let inserts = 0;
    db.runAsync = (async (sql: string, ...resto: unknown[]) => {
      if (/^\s*INSERT INTO (lancamentos|contas)\b/.test(sql)) inserts++;
      return original(sql, ...(resto as []));
    }) as typeof db.runAsync;

    await backupRepo.importarTudo(db, backup);
    expect(inserts).toBeLessThan(100);
  });
});

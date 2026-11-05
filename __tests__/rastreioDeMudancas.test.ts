import { SQLiteDatabase } from 'expo-sqlite';
import { criarBanco, criarBancoVazio } from './helpers/bancoEmMemoria';
import { executarMigracoes, VERSAO_BANCO } from '../src/db/migrations';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4 } from '../src/db/schema';
import { contasRepo } from '../src/db/repositorios/contasRepo';
import { configuracoesRepo } from '../src/db/repositorios/configuracoesRepo';
import { backupRepo } from '../src/db/repositorios/backupRepo';
import { categoriasRepo } from '../src/db/repositorios/categoriasRepo';
import { VERSAO_BACKUP, validarBackup } from '../src/domain/backup';
import { Conta } from '../src/types';

const ANTIGA = '2000-01-01T00:00:00.000Z';

const TABELAS_COM_UID = [
  'categorias',
  'pessoas',
  'contas',
  'lancamentos',
  'lancamentos_ignorados',
  'divisoes',
  'rendas',
  'rendas_recebidas',
  'reserva_meta',
  'reserva_aportes',
];

async function conta(db: SQLiteDatabase, extra: Partial<Conta> = {}): Promise<number> {
  return contasRepo.criar(db, {
    nome: 'Internet',
    categoria_id: 1,
    tipo: 'fixa',
    valor_centavos: 10000,
    dia_vencimento: 10,
    data_unica: null,
    parcelas_total: null,
    data_inicio: '2026-01-10',
    data_fim: null,
    ativa: 1,
    compartilhada: 0,
    sem_vencimento: 0,
    ...extra,
  });
}

async function pendencias(db: SQLiteDatabase, tabela: string): Promise<string[]> {
  const linhas = await db.getAllAsync<{ uid: string }>(
    'SELECT uid FROM sync_pendencias WHERE tabela = ?;',
    [tabela]
  );
  return linhas.map((l) => l.uid);
}

async function uidDe(db: SQLiteDatabase, tabela: string, id: number): Promise<string> {
  const l = await db.getFirstAsync<{ uid: string }>(`SELECT uid FROM ${tabela} WHERE id = ?;`, [
    id,
  ]);
  return l!.uid;
}

/** Banco como o app da versão 1.1.0 deixou: migrações 1 a 4, com dados. */
async function bancoNaVersao4(): Promise<SQLiteDatabase> {
  const db = criarBancoVazio();
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const sql of [SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4]) await db.execAsync(sql);
  await db.runAsync(
    "INSERT INTO categorias (nome, cor, icone) VALUES ('Moradia', '#0F766E', 'home');"
  );
  await db.runAsync("INSERT INTO categorias (nome, cor, icone) VALUES ('Pets', '#111111', 'paw');");
  await db.runAsync("INSERT INTO pessoas (nome) VALUES ('Eu');");
  await db.runAsync(
    `INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, dia_vencimento, data_inicio, ativa, compartilhada, criado_em)
     VALUES ('Aluguel', 1, 'fixa', 150000, 5, '2026-01-01', 1, 0, '2026-01-01T00:00:00.000Z');`
  );
  await db.runAsync(
    `INSERT INTO lancamentos (conta_id, mes_ref, vencimento, valor_centavos, pago)
     VALUES (1, '2026-11', '2026-11-05', 150000, 0);`
  );
  await db.runAsync("INSERT INTO configuracoes (chave, valor) VALUES ('nome', 'Ana');");
  await db.execAsync('PRAGMA user_version = 4;');
  return db;
}

describe('migrações 5 e 6: identidade e rastreio de mudanças', () => {
  it('a versão do banco é 6', () => {
    expect(VERSAO_BANCO).toBe(6);
  });

  it('dá uid e data a toda linha existente, sem criar pendências nem mexer nos dados', async () => {
    const db = await bancoNaVersao4();
    await executarMigracoes(db);

    const versao = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(versao?.user_version).toBe(6);

    for (const tabela of TABELAS_COM_UID) {
      const sem = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${tabela} WHERE uid IS NULL OR atualizado_em IS NULL;`
      );
      expect({ tabela, semUid: sem?.n }).toEqual({ tabela, semUid: 0 });
      const repetidos = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) - COUNT(DISTINCT uid) AS n FROM ${tabela};`
      );
      expect(repetidos?.n).toBe(0);
    }
    const aluguel = await db.getFirstAsync<{ valor_centavos: number }>(
      "SELECT valor_centavos FROM contas WHERE nome = 'Aluguel';"
    );
    expect(aluguel?.valor_centavos).toBe(150000);
    const total = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM sync_pendencias;'
    );
    expect(total?.n).toBe(0);
  });

  it('categorias padrão e a pessoa "Eu" têm uid igual em qualquer aparelho', async () => {
    const a = await bancoNaVersao4();
    const b = await criarBanco(); // instalação nova
    await executarMigracoes(a);
    const uids = async (db: SQLiteDatabase) =>
      (
        await db.getAllAsync<{ uid: string }>(
          "SELECT uid FROM categorias WHERE nome = 'Moradia' UNION ALL SELECT uid FROM pessoas WHERE nome = 'Eu';"
        )
      ).map((l) => l.uid);
    expect(await uids(a)).toEqual(await uids(b));
    expect((await uids(b))[0]).toMatch(/^padrao:/);
    // categoria criada pela pessoa tem uid próprio
    const pets = await a.getFirstAsync<{ uid: string }>(
      "SELECT uid FROM categorias WHERE nome = 'Pets';"
    );
    expect(pets?.uid).not.toMatch(/^padrao:/);
  });

  it('rodar as migrações de novo não muda nada', async () => {
    const db = await criarBanco();
    const antes = await db.getAllAsync('SELECT uid FROM categorias ORDER BY id;');
    await executarMigracoes(db);
    expect(await db.getAllAsync('SELECT uid FROM categorias ORDER BY id;')).toEqual(antes);
  });
});

describe('rastreio de mudanças', () => {
  it('linha criada pelo app ganha uid, data e vira pendência', async () => {
    const db = await criarBanco();
    const id = await conta(db);
    const l = await db.getFirstAsync<{ uid: string; atualizado_em: string }>(
      'SELECT uid, atualizado_em FROM contas WHERE id = ?;',
      [id]
    );
    expect(l?.uid).toMatch(/^[0-9a-f]{32}$/);
    expect(l?.atualizado_em).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(await pendencias(db, 'contas')).toEqual([l!.uid]);
  });

  it('editar avança a data e deixa a linha pendente de novo', async () => {
    const db = await criarBanco();
    const id = await conta(db);
    const uid = await uidDe(db, 'contas', id);
    await db.runAsync('DELETE FROM sync_pendencias;');
    await db.runAsync('UPDATE contas SET atualizado_em = ? WHERE id = ?;', [ANTIGA, id]);
    expect(await pendencias(db, 'contas')).toEqual([]); // ajustar só a data não é edição

    await db.runAsync("UPDATE contas SET nome = 'Fibra' WHERE id = ?;", [id]);
    const l = await db.getFirstAsync<{ atualizado_em: string }>(
      'SELECT atualizado_em FROM contas WHERE id = ?;',
      [id]
    );
    expect(l!.atualizado_em > ANTIGA).toBe(true);
    expect(await pendencias(db, 'contas')).toEqual([uid]);
  });

  it('excluir registra a exclusão, tira a pendência e leva junto o que estava ligado', async () => {
    const db = await criarBanco();
    const id = await conta(db);
    await db.runAsync(
      `INSERT INTO lancamentos (conta_id, mes_ref, vencimento, valor_centavos, pago)
       VALUES (?, '2026-11', '2026-11-10', 10000, 0);`,
      [id]
    );
    const uidConta = await uidDe(db, 'contas', id);
    const uidLanc = (await db.getFirstAsync<{ uid: string }>(
      'SELECT uid FROM lancamentos WHERE conta_id = ?;',
      [id]
    ))!.uid;

    await contasRepo.excluir(db, id);

    const ex = await db.getAllAsync<{ tabela: string; uid: string }>(
      'SELECT tabela, uid FROM sync_exclusoes ORDER BY tabela;'
    );
    expect(ex).toEqual([
      { tabela: 'contas', uid: uidConta },
      { tabela: 'lancamentos', uid: uidLanc },
    ]);
    expect(await pendencias(db, 'contas')).toEqual([]);
    expect(await pendencias(db, 'lancamentos')).toEqual([]);
  });

  it('linha aplicada pelo sync (já com uid e data) não vira pendência', async () => {
    const db = await criarBanco();
    await db.runAsync(
      `INSERT INTO categorias (nome, cor, icone, uid, atualizado_em)
       VALUES ('Pets', '#111111', 'paw', 'remoto-1', ?);`,
      [ANTIGA]
    );
    await db.runAsync(
      "UPDATE categorias SET nome = 'Animais', atualizado_em = ? WHERE uid = 'remoto-1';",
      ['2001-01-01T00:00:00.000Z']
    );
    expect(await pendencias(db, 'categorias')).toEqual([]);
    const l = await db.getFirstAsync<{ nome: string; atualizado_em: string }>(
      "SELECT nome, atualizado_em FROM categorias WHERE uid = 'remoto-1';"
    );
    expect(l).toEqual({ nome: 'Animais', atualizado_em: '2001-01-01T00:00:00.000Z' });
  });

  it('upsert de renda recebida marca só uma pendência por linha', async () => {
    const db = await criarBanco();
    await db.runAsync(
      `INSERT INTO rendas (nome, valor_centavos, dia_recebimento, tipo, ativa, criado_em)
       VALUES ('Salário', 500000, 5, 'fixa', 1, '2026-01-01T00:00:00.000Z');`
    );
    const ins = `INSERT INTO rendas_recebidas (renda_id, mes_ref, valor_centavos, recebida_em)
       VALUES (1, '2026-11', ?, '2026-11-05T00:00:00.000Z')
       ON CONFLICT (renda_id, mes_ref) DO UPDATE SET valor_centavos = excluded.valor_centavos;`;
    await db.runAsync(ins, [500000]);
    await db.runAsync(ins, [510000]);
    expect(await pendencias(db, 'rendas_recebidas')).toHaveLength(1);
    const l = await db.getFirstAsync<{ valor_centavos: number }>(
      'SELECT valor_centavos FROM rendas_recebidas;'
    );
    expect(l?.valor_centavos).toBe(510000);
  });

  it('configurações da pessoa sincronizam; as do aparelho não', async () => {
    const db = await criarBanco();
    await configuracoesRepo.salvar(db, {
      nome: 'Ana',
      notificacaoHora: 7,
      notificacoesAtivas: true,
    });
    expect(await pendencias(db, 'configuracoes')).toEqual(['nome']);
    const l = await db.getFirstAsync<{ atualizado_em: string }>(
      "SELECT atualizado_em FROM configuracoes WHERE chave = 'nome';"
    );
    expect(l?.atualizado_em).toMatch(/^\d{4}-/);

    await db.runAsync('DELETE FROM sync_pendencias;');
    await configuracoesRepo.salvar(db, { nome: 'Ana Maria' });
    expect(await pendencias(db, 'configuracoes')).toEqual(['nome']);
  });

  it('importar backup registra a exclusão dos dados antigos e mantém os totais', async () => {
    const db = await criarBanco();
    const id = await conta(db, { nome: 'Antiga' });
    const uidAntigo = await uidDe(db, 'contas', id);
    const backup = await backupRepo.exportarTudo(db, VERSAO_BANCO);

    await backupRepo.importarTudo(db, backup);

    const contas = await db.getAllAsync<{ nome: string; uid: string }>(
      'SELECT nome, uid FROM contas;'
    );
    expect(contas.map((c) => c.nome)).toEqual(['Antiga']);
    expect(contas[0].uid).not.toBe(uidAntigo);
    const ex = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_exclusoes WHERE tabela = 'contas' AND uid = ?;",
      [uidAntigo]
    );
    expect(ex?.n).toBe(1);
    expect(await pendencias(db, 'contas')).toEqual([contas[0].uid]);
  });

  it('excluir categoria movendo as contas continua funcionando', async () => {
    const db = await criarBanco();
    const { id } = await categoriasRepo.criarPeloNome(db, 'Pets');
    const idConta = await conta(db, { categoria_id: id! });
    const destino = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categorias WHERE nome = 'Outros';"
    );
    expect(await categoriasRepo.excluir(db, id!, destino!.id)).toBeNull();
    const c = await db.getFirstAsync<{ categoria_id: number }>(
      'SELECT categoria_id FROM contas WHERE id = ?;',
      [idConta]
    );
    expect(c?.categoria_id).toBe(destino!.id);
    const ex = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_exclusoes WHERE tabela = 'categorias';"
    );
    expect(ex?.n).toBe(1);
  });

  it('importar backup mantém a identidade fixa das categorias de fábrica e do "Eu"', async () => {
    const db = await criarBanco();
    const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);

    await backupRepo.importarTudo(db, backup);

    const fixos = await db.getAllAsync<{ uid: string }>(
      "SELECT uid FROM categorias WHERE uid LIKE 'padrao:%' UNION ALL SELECT uid FROM pessoas WHERE uid LIKE 'padrao:%';"
    );
    expect(fixos).toHaveLength(9);
    const excluidosFixos = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_exclusoes WHERE uid LIKE 'padrao:%';"
    );
    expect(excluidosFixos?.n).toBe(0);
    // nenhuma pendência aponta para um uid que não existe mais
    const orfas = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sync_pendencias p
       WHERE p.tabela = 'categorias' AND NOT EXISTS (SELECT 1 FROM categorias c WHERE c.uid = p.uid);`
    );
    expect(orfas?.n).toBe(0);
  });

  it('o formato do backup continua o da versão 4, que o app 1.1.0 ainda importa', async () => {
    expect(VERSAO_BACKUP).toBe(4);
    const db = await criarBanco();
    const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
    expect(backup.versaoBanco).toBe(4);
    expect(validarBackup(backup, 4).ok).toBe(true);
    expect(validarBackup({ ...backup, versaoBanco: 5 }, 4).ok).toBe(false);
  });

  it('uma linha que volta com o mesmo uid deixa de constar como excluída', async () => {
    const db = await criarBanco();
    await db.runAsync(
      "INSERT INTO categorias (nome, cor, icone, uid, atualizado_em) VALUES ('Pets', '#111111', 'paw', 'u-1', ?);",
      [ANTIGA]
    );
    await db.runAsync("DELETE FROM categorias WHERE uid = 'u-1';");
    const antes = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_exclusoes WHERE uid = 'u-1';"
    );
    expect(antes?.n).toBe(1);

    await db.runAsync(
      "INSERT INTO categorias (nome, cor, icone, uid, atualizado_em) VALUES ('Pets', '#111111', 'paw', 'u-1', ?);",
      [ANTIGA]
    );
    const depois = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_exclusoes WHERE uid = 'u-1';"
    );
    expect(depois?.n).toBe(0);
  });
});

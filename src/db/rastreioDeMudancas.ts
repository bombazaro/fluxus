import { SQLiteDatabase } from 'expo-sqlite';
import { CATEGORIAS_PADRAO } from './schema';

/** Tabelas cujas linhas têm identidade própria (`uid`) e vão para a conta na nuvem. */
export const TABELAS_COM_UID = [
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
] as const;

/** Configurações que valem só para este aparelho e nunca sincronizam. */
export const CONFIGURACOES_DO_APARELHO = [
  'notificacoesAtivas',
  'notificacaoHora',
  'notificacaoDiasAntes',
] as const;

/*
 * Atenção: dentro dos gatilhos não se usa `OR REPLACE`/`OR IGNORE`. Quando a instrução que
 * dispara o gatilho tem o seu próprio tratamento de conflito (como o upsert de
 * rendas_recebidas), o SQLite ignora o do gatilho e o INSERT falha.
 */

/** Data e hora atuais em UTC, com milissegundos, no mesmo formato que o app guarda. */
const AGORA = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const UID_NOVO = 'lower(hex(randomblob(16)))';

function gatilhosDaTabela(t: string): string {
  return `
    CREATE TRIGGER IF NOT EXISTS trg_${t}_inserida AFTER INSERT ON ${t}
    WHEN NEW.uid IS NULL
    BEGIN
      UPDATE ${t} SET uid = ${UID_NOVO}, atualizado_em = ${AGORA} WHERE rowid = NEW.rowid;
      INSERT INTO sync_pendencias (tabela, uid)
        SELECT '${t}', uid FROM ${t} WHERE rowid = NEW.rowid
        ON CONFLICT (tabela, uid) DO NOTHING;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_${t}_editada AFTER UPDATE ON ${t}
    WHEN NEW.atualizado_em IS OLD.atualizado_em AND NEW.uid IS OLD.uid
    BEGIN
      UPDATE ${t} SET atualizado_em = ${AGORA} WHERE rowid = NEW.rowid;
      INSERT INTO sync_pendencias (tabela, uid) VALUES ('${t}', NEW.uid)
        ON CONFLICT (tabela, uid) DO NOTHING;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_${t}_excluida AFTER DELETE ON ${t}
    WHEN OLD.uid IS NOT NULL
    BEGIN
      INSERT INTO sync_exclusoes (tabela, uid, excluido_em)
        VALUES ('${t}', OLD.uid, ${AGORA})
        ON CONFLICT (tabela, uid) DO UPDATE SET excluido_em = excluded.excluido_em;
      DELETE FROM sync_pendencias WHERE tabela = '${t}' AND uid = OLD.uid;
    END;
  `;
}

/** configuracoes não tem uid: a própria chave identifica a linha. */
function gatilhosDeConfiguracoes(): string {
  const doAparelho = CONFIGURACOES_DO_APARELHO.map((c) => `'${c}'`).join(', ');
  return `
    CREATE TRIGGER IF NOT EXISTS trg_configuracoes_inserida AFTER INSERT ON configuracoes
    WHEN NEW.atualizado_em IS NULL AND NEW.chave NOT IN (${doAparelho})
    BEGIN
      UPDATE configuracoes SET atualizado_em = ${AGORA} WHERE chave = NEW.chave;
      INSERT INTO sync_pendencias (tabela, uid) VALUES ('configuracoes', NEW.chave)
        ON CONFLICT (tabela, uid) DO NOTHING;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_configuracoes_editada AFTER UPDATE ON configuracoes
    WHEN NEW.atualizado_em IS OLD.atualizado_em AND NEW.chave NOT IN (${doAparelho})
    BEGIN
      UPDATE configuracoes SET atualizado_em = ${AGORA} WHERE chave = NEW.chave;
      INSERT INTO sync_pendencias (tabela, uid) VALUES ('configuracoes', NEW.chave)
        ON CONFLICT (tabela, uid) DO NOTHING;
    END;
  `;
}

/**
 * Migração 5: toda linha ganha `uid` (identidade igual em qualquer aparelho) e
 * `atualizado_em`; gatilhos marcam o que mudou e guardam o que foi excluído.
 * Assim os repositórios não precisam saber de sincronização.
 */
export async function aplicarRastreioDeMudancas(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_pendencias (
      tabela TEXT NOT NULL,
      uid TEXT NOT NULL,
      PRIMARY KEY (tabela, uid)
    );
    CREATE TABLE IF NOT EXISTS sync_exclusoes (
      tabela TEXT NOT NULL,
      uid TEXT NOT NULL,
      excluido_em TEXT NOT NULL,
      PRIMARY KEY (tabela, uid)
    );
    CREATE TABLE IF NOT EXISTS sync_estado (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  for (const t of TABELAS_COM_UID) {
    await db.execAsync(`
      ALTER TABLE ${t} ADD COLUMN uid TEXT;
      ALTER TABLE ${t} ADD COLUMN atualizado_em TEXT;
      UPDATE ${t} SET uid = ${UID_NOVO}, atualizado_em = ${AGORA};
    `);
  }

  // Categorias de fábrica e a pessoa "Eu": mesma identidade em todo aparelho, para não
  // aparecerem duplicadas quando dois aparelhos juntarem os dados.
  for (const c of CATEGORIAS_PADRAO) {
    await db.runAsync(
      `UPDATE categorias SET uid = ?
       WHERE id = (SELECT MIN(id) FROM categorias WHERE nome = ? AND cor = ? AND icone = ?);`,
      [`padrao:categoria:${c.nome}`, c.nome, c.cor, c.icone]
    );
  }
  await db.runAsync(
    "UPDATE pessoas SET uid = 'padrao:pessoa:eu' WHERE id = (SELECT MIN(id) FROM pessoas WHERE nome = 'Eu');"
  );

  for (const t of TABELAS_COM_UID) {
    await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${t}_uid ON ${t}(uid);`);
  }

  const doAparelho = CONFIGURACOES_DO_APARELHO.map((c) => `'${c}'`).join(', ');
  await db.execAsync(`
    ALTER TABLE configuracoes ADD COLUMN atualizado_em TEXT;
    UPDATE configuracoes SET atualizado_em = ${AGORA} WHERE chave NOT IN (${doAparelho});
  `);

  for (const t of TABELAS_COM_UID) await db.execAsync(gatilhosDaTabela(t));
  await db.execAsync(gatilhosDeConfiguracoes());
}

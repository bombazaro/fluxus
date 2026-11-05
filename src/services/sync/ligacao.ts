import { SQLiteDatabase } from 'expo-sqlite';
import { CONFIGURACOES_DO_APARELHO } from '@/src/db/rastreioDeMudancas';
import { TABELAS_SYNC } from '@/src/domain/sync/registro';
import { sincronizar } from './motor';
import { Rede } from './rede';

export class ErroOutraConta extends Error {
  constructor() {
    super(
      'Este aparelho já está ligado a outra conta. Para usar outra, apague os dados do app ' +
        'ou importe um backup limpo antes de entrar.'
    );
    this.name = 'ErroOutraConta';
  }
}

/**
 * Liga este aparelho à conta: marca tudo o que existe aqui para subir (inclusive o que foi
 * criado antes da conta existir) e faz a primeira rodada, que também traz o que já estava
 * na nuvem. Nada é apagado: os dois lados ficam juntos.
 */
export async function ligarConta(
  db: SQLiteDatabase,
  rede: Rede,
  usuarioId: string
): Promise<'novo' | 'mesclado'> {
  const ligado = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM sync_estado WHERE chave = 'usuario_id';"
  );
  if (ligado && ligado.valor !== usuarioId) throw new ErroOutraConta();

  const naNuvem = (await rede.buscar(null, 1)).length > 0;

  for (const def of TABELAS_SYNC) {
    if (def.tabela === 'configuracoes') {
      const doAparelho = CONFIGURACOES_DO_APARELHO.map(() => '?').join(', ');
      await db.runAsync(
        `INSERT INTO sync_pendencias (tabela, uid)
         SELECT 'configuracoes', chave FROM configuracoes WHERE chave NOT IN (${doAparelho})
         ON CONFLICT (tabela, uid) DO NOTHING;`,
        [...CONFIGURACOES_DO_APARELHO]
      );
    } else {
      await db.runAsync(
        `INSERT INTO sync_pendencias (tabela, uid)
         SELECT '${def.tabela}', uid FROM ${def.tabela} WHERE true
         ON CONFLICT (tabela, uid) DO NOTHING;`
      );
    }
  }
  await db.runAsync(
    `INSERT INTO sync_estado (chave, valor) VALUES ('usuario_id', ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor;`,
    [usuarioId]
  );
  await sincronizar(db, rede);
  return naNuvem ? 'mesclado' : 'novo';
}

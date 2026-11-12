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

/**
 * Apaga tudo o que a conta guardou na nuvem e esquece a ligação deste aparelho com ela.
 * Os dados do aparelho ficam como estão; ao entrar de novo, tudo sobe outra vez.
 */
export async function apagarDadosDaNuvem(
  db: SQLiteDatabase,
  cliente: { rpc(nome: string, args: Record<string, unknown>): PromiseLike<{ error: unknown }> }
): Promise<void> {
  const { error } = await cliente.rpc('excluir_meus_dados', {});
  if (error) throw new Error('Não foi possível apagar os dados da nuvem. Tente de novo.');
  await db.execAsync(`
    DELETE FROM sync_estado;
    DELETE FROM sync_pendencias;
    DELETE FROM sync_exclusoes;
  `);
}

/**
 * Há algo criado pela pessoa neste aparelho (além do que o app traz de fábrica)? Se não,
 * ligar a conta não arrisca nada e dispensa o backup de segurança.
 */
export async function temDadosParaProteger(db: SQLiteDatabase): Promise<boolean> {
  const l = await db.getFirstAsync<{ tem: number }>(
    `SELECT (
       EXISTS (SELECT 1 FROM contas) OR EXISTS (SELECT 1 FROM rendas)
       OR EXISTS (SELECT 1 FROM reserva_meta) OR EXISTS (SELECT 1 FROM reserva_aportes)
       OR EXISTS (SELECT 1 FROM pessoas WHERE uid <> 'padrao:pessoa:eu')
       OR EXISTS (SELECT 1 FROM categorias WHERE uid NOT LIKE 'padrao:categoria:%')
     ) AS tem;`
  );
  return l?.tem === 1;
}

/**
 * Aparelho sem nenhuma ligação e sem nada criado pela pessoa (ex.: o login ficou salvo, mas o
 * banco do aparelho foi apagado): liga à conta sozinho para os dados voltarem, sem backup, pois
 * não há o que proteger. Devolve true se ligou. Aparelho com dados próprios, ou já ligado
 * (a esta ou a outra conta), não é mexido: nesses casos a pessoa decide na tela de conta.
 */
export async function ligarAparelhoVazio(
  db: SQLiteDatabase,
  rede: Rede,
  usuarioId: string
): Promise<boolean> {
  const ligado = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM sync_estado WHERE chave = 'usuario_id';"
  );
  if (ligado) return false;
  if (await temDadosParaProteger(db)) return false;
  await ligarConta(db, rede, usuarioId);
  return true;
}

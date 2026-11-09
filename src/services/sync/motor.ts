import { SQLiteDatabase } from 'expo-sqlite';
import {
  assinaturaDe,
  DefinicaoTabela,
  IdDoPai,
  paraLinha,
  paraRegistro,
  Registro,
  registroExcluido,
  TABELAS_SYNC,
  TabelaSync,
  UidDoPai,
  Valor,
} from '@/src/domain/sync/registro';
import { decidir, MetaLinha } from '@/src/domain/sync/mescla';
import { lerInstante } from '@/src/domain/sync/data';
import { Cursor, Rede, RegistroRecebido } from './rede';

export interface ResultadoSync {
  enviados: number;
  recebidos: number;
  aplicados: number;
  /** Registros cujo pai ainda não chegou; são tentados de novo na próxima rodada. */
  adiados: number;
  /** Registros que não puderam ser gravados (dados inválidos); ficam de fora, o resto segue. */
  rejeitados: number;
}

const TAMANHO_LOTE = 500;
/** O servidor numera pela hora em que a transação começa; pode chegar fora de ordem. */
const FOLGA_DO_CURSOR_MS = 5000;
const RODADAS_ATE_DESISTIR = 3;
const TOLERANCIA_RELOGIO_MS = 60_000;

/** Colunas que juntas identificam uma linha que os aparelhos podem criar cada um por si. */
const CHAVE_NATURAL: Partial<Record<TabelaSync, string[]>> = {
  lancamentos: ['conta_id', 'mes_ref'],
  lancamentos_ignorados: ['conta_id', 'mes_ref'],
  rendas_recebidas: ['renda_id', 'mes_ref'],
  divisoes: ['lancamento_id', 'pessoa_id'],
  // tabela de uma linha só (o app lê a primeira): sem colunas, qualquer outra linha colide
  reserva_meta: [],
};

type Linha = Record<string, Valor>;

const agoraIso = () => new Date().toISOString();

function normalizarData(texto: string): string | null {
  const t = lerInstante(texto);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Ligação entre id local e uid, para traduzir as chaves estrangeiras. */
class Indice {
  private porUid = new Map<string, number>();
  private porId = new Map<string, string>();

  async carregar(db: SQLiteDatabase) {
    this.porUid.clear();
    this.porId.clear();
    for (const def of TABELAS_SYNC) {
      if (def.tabela === 'configuracoes') continue;
      const linhas = await db.getAllAsync<{ id: number | null; uid: string }>(
        def.tabela === 'lancamentos_ignorados'
          ? 'SELECT NULL AS id, uid FROM lancamentos_ignorados;'
          : `SELECT id, uid FROM ${def.tabela};`
      );
      for (const l of linhas) {
        if (l.id === null) continue;
        this.porUid.set(`${def.tabela}|${l.uid}`, l.id);
        this.porId.set(`${def.tabela}|${l.id}`, l.uid);
      }
    }
  }

  adicionar(tabela: string, id: number, uid: string) {
    this.porUid.set(`${tabela}|${uid}`, id);
    this.porId.set(`${tabela}|${id}`, uid);
  }

  readonly uidDoPai: UidDoPai = (tabela, id) => this.porId.get(`${tabela}|${id}`) ?? null;
  readonly idDoPai: IdDoPai = (tabela, uid) => this.porUid.get(`${tabela}|${uid}`) ?? null;
}

const colunaDeUid = (tabela: TabelaSync) => (tabela === 'configuracoes' ? 'chave' : 'uid');

async function lerLinha(db: SQLiteDatabase, tabela: TabelaSync, uid: string) {
  return db.getFirstAsync<Linha>(`SELECT * FROM ${tabela} WHERE ${colunaDeUid(tabela)} = ?;`, [
    uid,
  ]);
}

async function tombamento(db: SQLiteDatabase, tabela: string, uid: string) {
  return db.getFirstAsync<{ excluido_em: string }>(
    'SELECT excluido_em FROM sync_exclusoes WHERE tabela = ? AND uid = ?;',
    [tabela, uid]
  );
}

async function metaLocal(
  db: SQLiteDatabase,
  def: DefinicaoTabela,
  uid: string,
  indice: Indice
): Promise<{ meta: MetaLinha | null; linha: Linha | null }> {
  const linha = await lerLinha(db, def.tabela, uid);
  if (linha) {
    const registro = paraRegistro(def, linha, indice.uidDoPai);
    let atualizadoEm = String(linha.atualizado_em ?? '');
    // Data no futuro (relógio adiantado) que já foi enviada: o servidor a trocou pela hora
    // dele, então ela não pode ganhar de todas as edições dos outros aparelhos.
    if (lerInstante(atualizadoEm) > Date.now() + TOLERANCIA_RELOGIO_MS) {
      const pendente = await db.getFirstAsync(
        'SELECT 1 FROM sync_pendencias WHERE tabela = ? AND uid = ?;',
        [def.tabela, uid]
      );
      if (!pendente) atualizadoEm = new Date(0).toISOString();
    }
    return {
      linha,
      meta: {
        atualizadoEm,
        excluidoEm: null,
        assinatura: assinaturaDe(registro.dados),
      },
    };
  }
  const t = await tombamento(db, def.tabela, uid);
  if (!t) return { linha: null, meta: null };
  return {
    linha: null,
    meta: { atualizadoEm: t.excluido_em, excluidoEm: t.excluido_em, assinatura: 'excluida' },
  };
}

async function limparPendencia(db: SQLiteDatabase, tabela: string, uid: string) {
  await db.runAsync('DELETE FROM sync_pendencias WHERE tabela = ? AND uid = ?;', [tabela, uid]);
}

async function marcarPendente(db: SQLiteDatabase, tabela: string, uid: string) {
  await db.runAsync(
    'INSERT INTO sync_pendencias (tabela, uid) VALUES (?, ?) ON CONFLICT (tabela, uid) DO NOTHING;',
    [tabela, uid]
  );
}

async function marcarExcluida(db: SQLiteDatabase, tabela: string, uid: string, quando: string) {
  await db.runAsync(
    `INSERT INTO sync_exclusoes (tabela, uid, excluido_em) VALUES (?, ?, ?)
     ON CONFLICT (tabela, uid) DO UPDATE SET excluido_em = excluded.excluido_em;`,
    [tabela, uid, quando]
  );
}

// ---------------------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------------------

async function enviarMudancas(
  db: SQLiteDatabase,
  rede: Rede,
  indice: Indice
): Promise<{ enviados: number; rejeitados: number }> {
  let rejeitados = 0;
  const itens: { registro: Registro; limpar: () => Promise<void> }[] = [];

  for (const def of TABELAS_SYNC) {
    const pendentes = await db.getAllAsync<{ uid: string }>(
      'SELECT uid FROM sync_pendencias WHERE tabela = ? ORDER BY uid;',
      [def.tabela]
    );
    for (const { uid } of pendentes) {
      const linha = await lerLinha(db, def.tabela, uid);
      if (!linha) {
        await limparPendencia(db, def.tabela, uid);
        continue;
      }
      let registro: Registro;
      try {
        registro = paraRegistro(def, linha, indice.uidDoPai);
      } catch (err) {
        // uma linha que não dá para converter não pode impedir as outras de seguirem
        console.warn('Linha não enviada:', def.tabela, uid, err);
        rejeitados += 1;
        continue;
      }
      itens.push({
        registro,
        // se a linha mudou durante o envio, a pendência fica para a próxima rodada
        limpar: () =>
          db
            .runAsync(
              `DELETE FROM sync_pendencias WHERE tabela = ? AND uid = ?
               AND EXISTS (SELECT 1 FROM ${def.tabela} WHERE ${colunaDeUid(def.tabela)} = ?
                           AND atualizado_em = ?);`,
              [def.tabela, uid, uid, registro.atualizadoEm]
            )
            .then(() => undefined),
      });
    }
  }

  const exclusoes = await db.getAllAsync<{ tabela: TabelaSync; uid: string; excluido_em: string }>(
    'SELECT tabela, uid, excluido_em FROM sync_exclusoes ORDER BY tabela, uid;'
  );
  for (const e of exclusoes) {
    itens.push({
      registro: registroExcluido(e.tabela, e.uid, e.excluido_em),
      limpar: () =>
        db
          .runAsync(
            'DELETE FROM sync_exclusoes WHERE tabela = ? AND uid = ? AND excluido_em = ?;',
            [e.tabela, e.uid, e.excluido_em]
          )
          .then(() => undefined),
    });
  }

  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    const lote = itens.slice(i, i + TAMANHO_LOTE);
    await rede.enviar(lote.map((x) => x.registro));
    for (const x of lote) await x.limpar();
  }
  return { enviados: itens.length, rejeitados };
}

// ---------------------------------------------------------------------------------------
// Recebimento
// ---------------------------------------------------------------------------------------

type Destino = 'aplicado' | 'adiado' | 'ignorado';

async function gravar(
  db: SQLiteDatabase,
  def: DefinicaoTabela,
  existente: Linha | null,
  uid: string,
  valores: Linha,
  quando: string
): Promise<boolean> {
  // Sem transação (ela travaria as gravações da tela), então a troca só vale se a linha
  // continua como foi lida; se a pessoa editou nesse meio-tempo, a edição dela fica.
  const visto = existente ? (existente.atualizado_em ?? null) : null;
  if (def.tabela === 'configuracoes') {
    if (existente) {
      const r = await db.runAsync(
        'UPDATE configuracoes SET valor = ?, atualizado_em = ? WHERE chave = ? AND atualizado_em IS ?;',
        [valores.valor, quando, uid, visto]
      );
      if (r.changes === 0) return false;
    } else {
      await db.runAsync(
        'INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, ?);',
        [uid, valores.valor, quando]
      );
    }
  } else {
    const colunas = [...def.colunas, ...Object.keys(def.pais)];
    const params = colunas.map((c) => valores[c]);
    if (existente) {
      const r = await db.runAsync(
        `UPDATE ${def.tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')},
         atualizado_em = ? WHERE uid = ? AND atualizado_em IS ?;`,
        [...params, quando, uid, visto]
      );
      if (r.changes === 0) return false;
    } else {
      await db.runAsync(
        `INSERT INTO ${def.tabela} (${colunas.join(', ')}, uid, atualizado_em)
         VALUES (${[...colunas, 'uid', 'atualizado_em'].map(() => '?').join(', ')});`,
        [...params, uid, quando]
      );
    }
  }
  // O gatilho de edição marca a linha como pendente quando a data não muda (versões
  // diferentes com a mesma data). Volta a data para a do servidor e tira a pendência,
  // senão cada aparelho reenviaria a linha para sempre.
  const depois = await lerLinha(db, def.tabela, uid);
  if (depois && depois.atualizado_em !== quando) {
    await db.runAsync(
      `UPDATE ${def.tabela} SET atualizado_em = ? WHERE ${colunaDeUid(def.tabela)} = ?;`,
      [quando, uid]
    );
  }
  await limparPendencia(db, def.tabela, uid);
  return true;
}

/** Outra linha, com uid diferente, que representa a mesma coisa (mesmo mês da mesma conta, etc.). */
async function acharColisao(
  db: SQLiteDatabase,
  def: DefinicaoTabela,
  valores: Linha,
  uid: string
): Promise<Linha | null> {
  const chave = CHAVE_NATURAL[def.tabela];
  if (!chave) return null;
  const condicoes = [...chave.map((c) => `${c} = ?`), 'uid <> ?'].join(' AND ');
  return db.getFirstAsync<Linha>(`SELECT * FROM ${def.tabela} WHERE ${condicoes};`, [
    ...chave.map((c) => valores[c]),
    uid,
  ]);
}

async function aplicarVivo(
  db: SQLiteDatabase,
  def: DefinicaoTabela,
  reg: Registro,
  quando: string,
  indice: Indice
): Promise<Destino> {
  const resolvida = paraLinha(def, reg, indice.idDoPai);
  if (resolvida.status === 'ignorada') return 'ignorado';
  if (resolvida.status === 'pai-ausente') {
    // pai excluído de propósito: o filho não tem onde ficar
    if (await tombamento(db, resolvida.pai.tabela, resolvida.pai.uid)) return 'ignorado';
    return 'adiado';
  }
  const valores = resolvida.valores;
  let rebatizada = false;

  let { meta, linha } = await metaLocal(db, def, reg.uid, indice);

  if (!linha) {
    const colisao = await acharColisao(db, def, valores, reg.uid);
    if (colisao) {
      const uidLocal = String(colisao.uid);
      if (uidLocal < reg.uid) {
        // a linha daqui vence: a do servidor é descartada em todos os aparelhos
        await marcarExcluida(db, def.tabela, reg.uid, agoraIso());
        return 'ignorado';
      }
      // a do servidor vence: a linha daqui passa a ter o uid dela
      await db.runAsync(`UPDATE ${def.tabela} SET uid = ? WHERE uid = ?;`, [reg.uid, uidLocal]);
      await limparPendencia(db, def.tabela, uidLocal);
      await marcarExcluida(db, def.tabela, uidLocal, agoraIso());
      if (def.tabela === 'lancamentos') {
        // As divisões apontavam para o uid antigo. Precisam ser reenviadas com uma data nova,
        // senão o servidor (que só aceita versões mais novas) ficaria com o pai antigo.
        await db.runAsync(
          `UPDATE divisoes SET atualizado_em = ?
           WHERE lancamento_id = (SELECT id FROM lancamentos WHERE uid = ?);`,
          [agoraIso(), reg.uid]
        );
        await db.runAsync(
          `INSERT INTO sync_pendencias (tabela, uid)
           SELECT 'divisoes', uid FROM divisoes
           WHERE lancamento_id = (SELECT id FROM lancamentos WHERE uid = ?)
           ON CONFLICT (tabela, uid) DO NOTHING;`,
          [reg.uid]
        );
      }
      await indice.carregar(db);
      rebatizada = true;
      ({ meta, linha } = await metaLocal(db, def, reg.uid, indice));
    }
  }

  const remoto: MetaLinha = {
    atualizadoEm: quando,
    excluidoEm: null,
    assinatura: assinaturaDe(reg.dados),
  };
  const decisao = decidir(meta, remoto);
  if (decisao === 'aplicar-remoto') {
    if (!(await gravar(db, def, linha, reg.uid, valores, quando))) return 'ignorado';
    if (!linha && def.tabela !== 'configuracoes') {
      const nova = await lerLinha(db, def.tabela, reg.uid);
      if (nova && typeof nova.id === 'number') indice.adicionar(def.tabela, nova.id, reg.uid);
    }
    return 'aplicado';
  }
  if (decisao === 'manter-local' && rebatizada) await marcarPendente(db, def.tabela, reg.uid);
  return 'ignorado';
}

async function aplicarExclusao(
  db: SQLiteDatabase,
  def: DefinicaoTabela,
  reg: Registro,
  quando: string,
  indice: Indice
): Promise<Destino> {
  if (def.tabela === 'configuracoes') return 'ignorado';
  const { meta, linha } = await metaLocal(db, def, reg.uid, indice);
  const remoto: MetaLinha = { atualizadoEm: quando, excluidoEm: quando, assinatura: 'excluida' };
  if (decidir(meta, remoto) !== 'aplicar-remoto') return 'ignorado';
  if (linha) {
    const r = await db.runAsync(`DELETE FROM ${def.tabela} WHERE uid = ? AND atualizado_em IS ?;`, [
      reg.uid,
      linha.atualizado_em ?? null,
    ]);
    if (r.changes === 0) return 'ignorado'; // editada agora há pouco: a edição fica
    await indice.carregar(db);
  }
  // Só guarda a exclusão se a linha existia aqui. Com a data do servidor, o reenvio dela é
  // ignorado pelo servidor (mesma versão) e a exclusão não volta a circular.
  if (linha || meta) await marcarExcluida(db, def.tabela, reg.uid, quando);
  return linha ? 'aplicado' : 'ignorado';
}

async function aplicarRegistro(
  db: SQLiteDatabase,
  r: RegistroRecebido,
  indice: Indice
): Promise<Destino> {
  const def = TABELAS_SYNC.find((d) => d.tabela === r.tabela);
  const quando = normalizarData(r.atualizadoEm);
  if (!def || quando === null) return 'ignorado';
  return r.dados === null || r.excluidoEm !== null
    ? aplicarExclusao(db, def, r, quando, indice)
    : aplicarVivo(db, def, r, quando, indice);
}

const ordem = (t: string) => TABELAS_SYNC.findIndex((d) => d.tabela === t);

async function lerEstado(db: SQLiteDatabase, chave: string): Promise<string | null> {
  const l = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM sync_estado WHERE chave = ?;',
    [chave]
  );
  return l?.valor ?? null;
}

async function gravarEstado(db: SQLiteDatabase, chave: string, valor: string) {
  await db.runAsync(
    `INSERT INTO sync_estado (chave, valor) VALUES (?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor;`,
    [chave, valor]
  );
}

async function receberMudancas(
  db: SQLiteDatabase,
  rede: Rede,
  indice: Indice
): Promise<Pick<ResultadoSync, 'recebidos' | 'aplicados' | 'adiados' | 'rejeitados'>> {
  const texto = await lerEstado(db, 'cursor');
  const salvo: Cursor | null = texto ? (JSON.parse(texto) as Cursor) : null;
  // recomeça um pouco antes, porque o servidor pode ter gravado fora de ordem; juntar de
  // novo uma linha que já temos não muda nada
  let cursor: Cursor | null = salvo
    ? {
        recebidoEm: new Date(lerInstante(salvo.recebidoEm) - FOLGA_DO_CURSOR_MS).toISOString(),
        tabela: '',
        uid: '',
      }
    : null;
  let ancora: Cursor | null = salvo;
  let recebidos = 0;
  let aplicados = 0;
  let rejeitados = 0;
  let adiados: RegistroRecebido[] = [];

  // Um registro com defeito (ex.: de uma versão antiga do app) não pode travar os demais.
  const aplicar = async (r: RegistroRecebido): Promise<Destino> => {
    try {
      return await aplicarRegistro(db, r, indice);
    } catch (err) {
      console.warn('Registro recusado:', r.tabela, r.uid, err);
      rejeitados += 1;
      return 'ignorado';
    }
  };

  for (;;) {
    const pagina = await rede.buscar(cursor, TAMANHO_LOTE);
    if (pagina.length === 0) break;
    recebidos += pagina.length;
    const ultimo = pagina[pagina.length - 1];
    cursor = { recebidoEm: ultimo.recebidoEm, tabela: ultimo.tabela, uid: ultimo.uid };

    const fila = [...adiados, ...pagina].sort((a, b) => ordem(a.tabela) - ordem(b.tabela));
    adiados = [];
    await indice.carregar(db);
    for (const r of fila) {
      const destino = await aplicar(r);
      if (destino === 'aplicado') aplicados += 1;
      else if (destino === 'adiado') adiados.push(r);
    }
    // um pai aplicado depois do filho libera os adiados
    if (adiados.length > 0) {
      const deNovo = adiados;
      adiados = [];
      for (const r of deNovo) {
        const destino = await aplicar(r);
        if (destino === 'aplicado') aplicados += 1;
        else if (destino === 'adiado') adiados.push(r);
      }
    }
    if (adiados.length === 0) ancora = cursor;
    if (pagina.length < TAMANHO_LOTE) break;
  }

  if (adiados.length === 0) {
    await gravarEstado(db, 'rodadas_adiadas', '0');
  } else {
    // o cursor fica antes do primeiro adiado, para tentar de novo; depois de algumas
    // rodadas sem o pai aparecer, a linha é dada como órfã e o cursor segue
    const rodadas = Number(await lerEstado(db, 'rodadas_adiadas')) + 1;
    if (rodadas >= RODADAS_ATE_DESISTIR) {
      ancora = cursor;
      await gravarEstado(db, 'rodadas_adiadas', '0');
    } else {
      await gravarEstado(db, 'rodadas_adiadas', String(rodadas));
    }
  }
  if (ancora) await gravarEstado(db, 'cursor', JSON.stringify(ancora));
  return { recebidos, aplicados, adiados: adiados.length, rejeitados };
}

const filas = new WeakMap<object, Promise<unknown>>();

/**
 * Uma rodada completa: envia o que mudou aqui e traz o que mudou nos outros aparelhos.
 * Pode ser chamada quantas vezes quiser; se a rede cair no meio, a próxima rodada continua
 * de onde parou (nada se perde nem se duplica). Rodadas do mesmo banco nunca se sobrepõem.
 */
export function sincronizar(db: SQLiteDatabase, rede: Rede): Promise<ResultadoSync> {
  const anterior = filas.get(db) ?? Promise.resolve();
  const rodada = anterior.catch(() => undefined).then(() => rodarUma(db, rede));
  filas.set(db, rodada);
  return rodada;
}

async function rodarUma(db: SQLiteDatabase, rede: Rede): Promise<ResultadoSync> {
  const indice = new Indice();
  await indice.carregar(db);
  const envio = await enviarMudancas(db, rede, indice);
  const recebido = await receberMudancas(db, rede, indice);
  return {
    enviados: envio.enviados,
    ...recebido,
    rejeitados: recebido.rejeitados + envio.rejeitados,
  };
}

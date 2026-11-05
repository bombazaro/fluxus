import { SQLiteDatabase } from 'expo-sqlite';
import { sincronizar } from '../src/services/sync/motor';
import { criarRedeFalsa } from '../src/services/sync/rede.fake';
import { criarBanco } from './helpers/bancoEmMemoria';

async function novaConta(db: SQLiteDatabase, nome: string, valor = 10000) {
  const r = await db.runAsync(
    `INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, dia_vencimento, data_inicio, criado_em)
     VALUES (?, (SELECT id FROM categorias WHERE nome = 'Outros'), 'fixa', ?, 5, '2026-01-01', '2026-01-01T00:00:00.000Z');`,
    [nome, valor]
  );
  return r.lastInsertRowId;
}

async function novoLancamento(db: SQLiteDatabase, contaId: number, mes = '2026-11') {
  const r = await db.runAsync(
    `INSERT INTO lancamentos (conta_id, mes_ref, vencimento, valor_centavos) VALUES (?, ?, ?, 10000);`,
    [contaId, mes, `${mes}-05`]
  );
  return r.lastInsertRowId;
}

const contas = (db: SQLiteDatabase) =>
  db.getAllAsync<{ nome: string; valor_centavos: number; uid: string }>(
    'SELECT nome, valor_centavos, uid FROM contas ORDER BY nome;'
  );
const contar = async (db: SQLiteDatabase, sql: string) =>
  (await db.getFirstAsync<{ n: number }>(sql))!.n;
const pendencias = (db: SQLiteDatabase) =>
  contar(
    db,
    'SELECT (SELECT COUNT(*) FROM sync_pendencias) + (SELECT COUNT(*) FROM sync_exclusoes) AS n;'
  );

/** Duas rodadas em cada aparelho: o que um envia, o outro traz, e vice-versa. */
async function acalmar(
  a: SQLiteDatabase,
  b: SQLiteDatabase,
  rede: ReturnType<typeof criarRedeFalsa>['rede']
) {
  for (let i = 0; i < 2; i++) {
    await sincronizar(a, rede);
    await sincronizar(b, rede);
  }
}

// o relógio do SQLite tem milissegundos; sem isto duas edições seguidas podem empatar
const passar = () => new Promise((r) => setTimeout(r, 5));

describe('sincronizar', () => {
  it('conta criada num aparelho aparece no outro, sem duplicar nas rodadas seguintes', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);
    await acalmar(a, b, rede);
    expect((await contas(b)).map((c) => c.nome)).toEqual(['Aluguel']);
    expect((await contas(a)).map((c) => c.nome)).toEqual(['Aluguel']);
    expect((await contas(a))[0].uid).toBe((await contas(b))[0].uid);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM categorias;')).toBe(8);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM pessoas;')).toBe(1);
  });

  it('sem mudanças, a rodada não envia nem aplica nada', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);
    const r = await sincronizar(a, rede);
    expect(r.enviados).toBe(0);
    expect(r.aplicados).toBe(0);
    expect(await pendencias(a)).toBe(0);
    expect(await pendencias(b)).toBe(0);
  });

  it('edição concorrente: a mais recente vence nos dois aparelhos', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);

    await a.runAsync("UPDATE contas SET valor_centavos = 111 WHERE nome = 'Aluguel';");
    await passar();
    await b.runAsync("UPDATE contas SET valor_centavos = 222 WHERE nome = 'Aluguel';");
    await acalmar(a, b, rede);

    expect((await contas(a))[0].valor_centavos).toBe(222);
    expect((await contas(b))[0].valor_centavos).toBe(222);
    expect(await pendencias(a)).toBe(0);
    expect(await pendencias(b)).toBe(0);
  });

  it('exclusão num aparelho some no outro, com os filhos', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    const id = await novaConta(a, 'Aluguel');
    await novoLancamento(a, id);
    await acalmar(a, b, rede);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(1);

    await a.runAsync('DELETE FROM contas WHERE id = ?;', [id]);
    await acalmar(a, b, rede);
    expect(await contas(b)).toEqual([]);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(0);
    // e depois de calmo, ninguém fica reenviando a exclusão
    await acalmar(a, b, rede);
    expect(await pendencias(a)).toBe(0);
    expect(await pendencias(b)).toBe(0);
  });

  it('exclusão recebida não gera ping-pong: o servidor para de mudar', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const servidor = criarRedeFalsa();
    const id = await novaConta(a, 'Aluguel');
    await acalmar(a, b, servidor.rede);
    await a.runAsync('DELETE FROM contas WHERE id = ?;', [id]);
    await acalmar(a, b, servidor.rede);
    const antes = JSON.stringify(servidor.linhas());
    await acalmar(a, b, servidor.rede);
    expect(JSON.stringify(servidor.linhas())).toBe(antes);
  });

  it('a rede cai no meio do envio: nada se perde nem duplica ao tentar de novo', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    let falhar = true;
    const { rede } = criarRedeFalsa({
      aoEnviar: (n) => {
        if (falhar && n === 1) throw new Error('sem rede');
      },
    });
    await novaConta(a, 'Aluguel');
    await novaConta(a, 'Luz');
    await expect(sincronizar(a, rede)).rejects.toThrow('sem rede');
    expect(await pendencias(a)).toBeGreaterThan(0);

    falhar = false;
    await acalmar(a, b, rede);
    expect((await contas(b)).map((c) => c.nome)).toEqual(['Aluguel', 'Luz']);
    expect(await pendencias(a)).toBe(0);
  });

  it('edição feita durante o envio continua pendente', async () => {
    const a = await criarBanco();
    const { rede } = criarRedeFalsa({
      aoEnviar: () => {
        // a pessoa edita no meio do envio
        a.runAsync("UPDATE contas SET valor_centavos = 999 WHERE nome = 'Aluguel';");
      },
    });
    await novaConta(a, 'Aluguel');
    await sincronizar(a, rede);
    expect(await pendencias(a)).toBe(1);
  });

  it('relógio adiantado não vence as edições seguintes dos outros aparelhos', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await a.runAsync(
      "UPDATE contas SET atualizado_em = '2099-01-01T00:00:00.000Z' WHERE nome = 'Aluguel';"
    );
    await a.runAsync(
      "INSERT INTO sync_pendencias (tabela, uid) SELECT 'contas', uid FROM contas WHERE true ON CONFLICT (tabela, uid) DO NOTHING;"
    );
    await acalmar(a, b, rede);
    await b.runAsync("UPDATE contas SET valor_centavos = 777 WHERE nome = 'Aluguel';");
    await acalmar(a, b, rede);
    expect((await contas(b))[0].valor_centavos).toBe(777);
  });

  it('filho que chega antes do pai espera e é aplicado depois', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    const id = await novaConta(a, 'Aluguel');
    await novoLancamento(a, id);
    // o pai é enviado numa rodada e o filho em outra, na ordem inversa de leitura do servidor
    await acalmar(a, b, rede);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(1);
    expect(
      await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos l JOIN contas c ON c.id = l.conta_id;')
    ).toBe(1);
  });

  it('o mesmo lançamento gerado nos dois aparelhos vira um só', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    const ia = await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);
    const ib = (await b.getFirstAsync<{ id: number }>(
      "SELECT id FROM contas WHERE nome = 'Aluguel';"
    ))!.id;
    await novoLancamento(a, ia);
    await novoLancamento(b, ib);
    await acalmar(a, b, rede);
    await acalmar(a, b, rede);
    expect(await contar(a, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(1);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(1);
    const ua = await a.getFirstAsync<{ uid: string }>('SELECT uid FROM lancamentos;');
    const ub = await b.getFirstAsync<{ uid: string }>('SELECT uid FROM lancamentos;');
    expect(ua!.uid).toBe(ub!.uid);
    expect(await pendencias(a)).toBe(0);
    expect(await pendencias(b)).toBe(0);
  });

  it('divisão do lançamento duplicado acompanha o lançamento que ficou', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    const ia = await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);
    const ib = (await b.getFirstAsync<{ id: number }>(
      "SELECT id FROM contas WHERE nome = 'Aluguel';"
    ))!.id;
    const la = await novoLancamento(a, ia);
    const lb = await novoLancamento(b, ib);
    await a.runAsync(
      'INSERT INTO divisoes (lancamento_id, pessoa_id, valor_centavos) VALUES (?, (SELECT id FROM pessoas LIMIT 1), 5000);',
      [la]
    );
    await b.runAsync(
      'INSERT INTO divisoes (lancamento_id, pessoa_id, valor_centavos) VALUES (?, (SELECT id FROM pessoas LIMIT 1), 4000);',
      [lb]
    );
    await acalmar(a, b, rede);
    await acalmar(a, b, rede);
    for (const db of [a, b]) {
      expect(await contar(db, 'SELECT COUNT(*) AS n FROM lancamentos;')).toBe(1);
      expect(
        await contar(
          db,
          'SELECT COUNT(*) AS n FROM divisoes d JOIN lancamentos l ON l.id = d.lancamento_id;'
        )
      ).toBe(await contar(db, 'SELECT COUNT(*) AS n FROM divisoes;'));
    }
    expect(await contar(a, 'SELECT COUNT(*) AS n FROM divisoes;')).toBe(
      await contar(b, 'SELECT COUNT(*) AS n FROM divisoes;')
    );
  });

  it('mês ignorado nos dois aparelhos não quebra a sincronização', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    const ia = await novaConta(a, 'Aluguel');
    await acalmar(a, b, rede);
    const ib = (await b.getFirstAsync<{ id: number }>(
      "SELECT id FROM contas WHERE nome = 'Aluguel';"
    ))!.id;
    await a.runAsync(
      "INSERT INTO lancamentos_ignorados (conta_id, mes_ref) VALUES (?, '2026-12');",
      [ia]
    );
    await b.runAsync(
      "INSERT INTO lancamentos_ignorados (conta_id, mes_ref) VALUES (?, '2026-12');",
      [ib]
    );
    await acalmar(a, b, rede);
    await acalmar(a, b, rede);
    expect(await contar(a, 'SELECT COUNT(*) AS n FROM lancamentos_ignorados;')).toBe(1);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM lancamentos_ignorados;')).toBe(1);
  });

  it('renda recebida nos dois aparelhos no mesmo mês vira uma só', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await a.runAsync(
      "INSERT INTO rendas (nome, valor_centavos, dia_recebimento, criado_em) VALUES ('Salário', 500000, 5, '2026-01-01T00:00:00.000Z');"
    );
    await acalmar(a, b, rede);
    for (const db of [a, b]) {
      await db.runAsync(
        "INSERT INTO rendas_recebidas (renda_id, mes_ref, valor_centavos, recebida_em) VALUES ((SELECT id FROM rendas), '2026-11', 500000, '2026-11-05T09:00:00.000Z');"
      );
    }
    await acalmar(a, b, rede);
    await acalmar(a, b, rede);
    expect(await contar(a, 'SELECT COUNT(*) AS n FROM rendas_recebidas;')).toBe(1);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM rendas_recebidas;')).toBe(1);
  });

  it('configuração sincroniza, mas as do aparelho ficam onde estão', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede, linhas } = criarRedeFalsa();
    await a.runAsync("INSERT INTO configuracoes (chave, valor) VALUES ('tema', 'escuro');");
    await a.runAsync("INSERT INTO configuracoes (chave, valor) VALUES ('notificacaoHora', '7');");
    await acalmar(a, b, rede);
    const tema = await b.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM configuracoes WHERE chave = 'tema';"
    );
    expect(tema?.valor).toBe('escuro');
    expect(
      await contar(b, "SELECT COUNT(*) AS n FROM configuracoes WHERE chave = 'notificacaoHora';")
    ).toBe(0);
    expect(linhas().some((l) => l.uid === 'notificacaoHora')).toBe(false);
    expect(await pendencias(a)).toBe(0);
  });

  it('categorias de fábrica não duplicam entre aparelhos', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await acalmar(a, b, rede);
    expect(await contar(a, 'SELECT COUNT(*) AS n FROM categorias;')).toBe(8);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM categorias;')).toBe(8);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM pessoas;')).toBe(1);
  });

  it('mais de 500 linhas são enviadas em mais de um lote e chegam inteiras', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await a.withTransactionAsync(async () => {
      for (let i = 0; i < 620; i++) await novaConta(a, `Conta ${String(i).padStart(3, '0')}`);
    });
    await acalmar(a, b, rede);
    expect(await contar(b, 'SELECT COUNT(*) AS n FROM contas;')).toBe(620);
  });
});

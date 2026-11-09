import { SQLiteDatabase } from 'expo-sqlite';
import {
  apagarDadosDaNuvem,
  ErroOutraConta,
  ligarConta,
  temDadosParaProteger,
} from '../src/services/sync/ligacao';
import { sincronizar } from '../src/services/sync/motor';
import { criarRedeFalsa } from '../src/services/sync/rede.fake';
import { criarBanco } from './helpers/bancoEmMemoria';

async function novaConta(db: SQLiteDatabase, nome: string) {
  await db.runAsync(
    `INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, dia_vencimento, data_inicio, criado_em)
     VALUES (?, (SELECT id FROM categorias WHERE nome = 'Outros'), 'fixa', 1000, 5, '2026-01-01', '2026-01-01T00:00:00.000Z');`,
    [nome]
  );
}
const nomes = async (db: SQLiteDatabase) =>
  (await db.getAllAsync<{ nome: string }>('SELECT nome FROM contas ORDER BY nome;')).map(
    (c) => c.nome
  );
const n = async (db: SQLiteDatabase, sql: string) =>
  (await db.getFirstAsync<{ n: number }>(sql))!.n;

describe('ligarConta', () => {
  it('conta vazia na nuvem: tudo que existe aqui sobe, resultado "novo"', async () => {
    const a = await criarBanco();
    const { rede, linhas } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    expect(await ligarConta(a, rede, 'u1')).toBe('novo');
    expect(linhas().some((l) => l.tabela === 'contas' && l.dados !== null)).toBe(true);
  });

  it('dados antigos sem pendência (anteriores à conta) também sobem', async () => {
    const a = await criarBanco();
    const { rede, linhas } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await a.runAsync('DELETE FROM sync_pendencias;'); // como se já existisse antes da conta
    await ligarConta(a, rede, 'u1');
    expect(linhas().filter((l) => l.tabela === 'contas')).toHaveLength(1);
  });

  it('conta com dados de outro aparelho: os dois conjuntos ficam juntos, resultado "mesclado"', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await ligarConta(a, rede, 'u1');
    await novaConta(b, 'Luz');
    expect(await ligarConta(b, rede, 'u1')).toBe('mesclado');
    await sincronizar(a, rede);
    expect(await nomes(a)).toEqual(['Aluguel', 'Luz']);
    expect(await nomes(b)).toEqual(['Aluguel', 'Luz']);
  });

  it('categorias de fábrica e a pessoa "Eu" não duplicam', async () => {
    const [a, b] = [await criarBanco(), await criarBanco()];
    const { rede } = criarRedeFalsa();
    await ligarConta(a, rede, 'u1');
    await ligarConta(b, rede, 'u1');
    await sincronizar(a, rede);
    expect(await n(b, 'SELECT COUNT(*) AS n FROM categorias;')).toBe(8);
    expect(await n(b, 'SELECT COUNT(*) AS n FROM pessoas;')).toBe(1);
  });

  it('aparelho já ligado a outra conta recusa e não envia nada', async () => {
    const a = await criarBanco();
    const { rede, linhas } = criarRedeFalsa();
    await ligarConta(a, rede, 'u1');
    const antes = linhas().length;
    await novaConta(a, 'Aluguel');
    await expect(ligarConta(a, rede, 'u2')).rejects.toBeInstanceOf(ErroOutraConta);
    await expect(ligarConta(a, rede, 'u2')).rejects.toThrow('já está ligado a outra conta');
    expect(linhas().length).toBe(antes);
  });

  it('ligar de novo com a mesma conta é permitido e não duplica', async () => {
    const a = await criarBanco();
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await ligarConta(a, rede, 'u1');
    await ligarConta(a, rede, 'u1');
    expect(await nomes(a)).toEqual(['Aluguel']);
  });

  it('configurações do aparelho não sobem', async () => {
    const a = await criarBanco();
    const { rede, linhas } = criarRedeFalsa();
    await a.runAsync("INSERT INTO configuracoes (chave, valor) VALUES ('notificacaoHora', '7');");
    await a.runAsync("INSERT INTO configuracoes (chave, valor) VALUES ('tema', 'escuro');");
    await ligarConta(a, rede, 'u1');
    expect(linhas().map((l) => l.uid)).toContain('tema');
    expect(linhas().map((l) => l.uid)).not.toContain('notificacaoHora');
  });

  it('apagar os dados da nuvem esquece a ligação e mantém os dados do aparelho', async () => {
    const a = await criarBanco();
    const { rede } = criarRedeFalsa();
    await novaConta(a, 'Aluguel');
    await ligarConta(a, rede, 'u1');
    const rpc = jest.fn().mockResolvedValue({ error: null });
    await apagarDadosDaNuvem(a, { rpc });
    expect(rpc).toHaveBeenCalledWith('excluir_meus_dados', {});
    expect(await nomes(a)).toEqual(['Aluguel']);
    expect(await n(a, 'SELECT COUNT(*) AS n FROM sync_estado;')).toBe(0);
    // agora pode entrar com outra conta
    await expect(ligarConta(a, rede, 'u2')).resolves.toBeDefined();
  });

  it('se o servidor falhar ao apagar, a ligação continua', async () => {
    const a = await criarBanco();
    const { rede } = criarRedeFalsa();
    await ligarConta(a, rede, 'u1');
    const rpc = jest.fn().mockResolvedValue({ error: { message: 'x' } });
    await expect(apagarDadosDaNuvem(a, { rpc })).rejects.toThrow(/apagar/);
    expect(await n(a, "SELECT COUNT(*) AS n FROM sync_estado WHERE chave = 'usuario_id';")).toBe(1);
  });

  it('aparelho recém-aberto, só com o que vem de fábrica, não tem o que proteger', async () => {
    expect(await temDadosParaProteger(await criarBanco())).toBe(false);
  });

  it.each([
    [
      'uma conta',
      "INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, data_inicio, criado_em) VALUES ('Luz', 1, 'unica', 100, '2026-01-01', '2026-01-01T00:00:00.000Z');",
    ],
    [
      'uma renda',
      "INSERT INTO rendas (nome, valor_centavos, dia_recebimento, criado_em) VALUES ('Salário', 100, 5, '2026-01-01T00:00:00.000Z');",
    ],
    [
      'um aporte na reserva',
      "INSERT INTO reserva_aportes (valor_centavos, data) VALUES (100, '2026-01-01');",
    ],
    ['uma meta de reserva', 'INSERT INTO reserva_meta (valor_meta_centavos) VALUES (100);'],
    ['uma pessoa nova', "INSERT INTO pessoas (nome) VALUES ('Ana');"],
    [
      'uma categoria própria',
      "INSERT INTO categorias (nome, cor, icone) VALUES ('Pets', '#000000', 'paw');",
    ],
  ])('com %s há o que proteger', async (_nome, sql) => {
    const a = await criarBanco();
    await a.runAsync(sql);
    expect(await temDadosParaProteger(a)).toBe(true);
  });
});

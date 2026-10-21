import { SQLiteDatabase } from 'expo-sqlite';
import { criarBanco, criarBancoVazio } from './helpers/bancoEmMemoria';
import { executarMigracoes, VERSAO_BANCO } from '../src/db/migrations';
import { SCHEMA_V1 } from '../src/db/schema';
import { contasRepo } from '../src/db/repositorios/contasRepo';
import { lancamentosRepo } from '../src/db/repositorios/lancamentosRepo';
import { rendasRepo } from '../src/db/repositorios/rendasRepo';
import { divisoesRepo } from '../src/db/repositorios/divisoesRepo';
import { pessoasRepo } from '../src/db/repositorios/pessoasRepo';
import { backupRepo } from '../src/db/repositorios/backupRepo';
import { previsaoRepo } from '../src/db/repositorios/previsaoRepo';
import { Conta } from '../src/types';

async function criarConta(
  db: SQLiteDatabase,
  extra: Partial<Omit<Conta, 'id' | 'criado_em'>> = {}
): Promise<number> {
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

async function criarLancamento(
  db: SQLiteDatabase,
  contaId: number,
  mesRef: string,
  pago: 0 | 1 = 0,
  valorCentavos = 10000
): Promise<number> {
  return lancamentosRepo.criar(db, {
    conta_id: contaId,
    mes_ref: mesRef,
    vencimento: `${mesRef}-10`,
    valor_centavos: valorCentavos,
    pago,
    pago_em: pago ? `${mesRef}-10T12:00:00.000Z` : null,
    parcela_numero: null,
  });
}

describe('migrações', () => {
  it('cria o banco na versão atual com categorias e a pessoa "Eu"', async () => {
    const db = await criarBanco();

    const versao = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    expect(versao?.user_version).toBe(VERSAO_BANCO);
    expect((await db.getAllAsync('SELECT * FROM categorias;')).length).toBe(8);
    expect(await pessoasRepo.listarTodas(db)).toEqual([{ id: 1, nome: 'Eu' }]);
  });

  it('pode rodar de novo sem duplicar nada', async () => {
    const db = await criarBanco();
    await executarMigracoes(db);

    expect((await db.getAllAsync('SELECT * FROM categorias;')).length).toBe(8);
    expect((await pessoasRepo.listarTodas(db)).length).toBe(1);
  });

  it('migra da v1 para a v2 mantendo os dados e removendo baixas de renda duplicadas', async () => {
    const db = criarBancoVazio();
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1;');
    await db.runAsync(
      "INSERT INTO rendas (nome, valor_centavos, dia_recebimento, tipo, ativa, criado_em) VALUES ('Salário', 300000, 5, 'fixa', 1, '2026-01-01');"
    );
    for (let i = 0; i < 2; i++) {
      await db.runAsync(
        "INSERT INTO rendas_recebidas (renda_id, mes_ref, valor_centavos, recebida_em) VALUES (1, '2026-05', 300000, '2026-05-05');"
      );
    }

    await executarMigracoes(db);

    expect((await rendasRepo.listarTodas(db))[0]).toMatchObject({ nome: 'Salário', mes_ref: null });
    expect(await rendasRepo.listarRecebidasDoMes(db, '2026-05')).toHaveLength(1);
  });
});

describe('migração v3', () => {
  it('contas antigas ficam com vencimento (sem_vencimento = 0)', async () => {
    const db = criarBancoVazio();
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1;');
    await db.runAsync(
      "INSERT INTO categorias (nome, cor, icone) VALUES ('Moradia', '#000', 'home');"
    );
    await db.runAsync(
      "INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, dia_vencimento, data_inicio, criado_em) VALUES ('Aluguel', 1, 'fixa', 150000, 5, '2026-01-05', '2026-01-01');"
    );

    await executarMigracoes(db);

    expect((await contasRepo.listarTodas(db))[0]).toMatchObject({
      nome: 'Aluguel',
      sem_vencimento: 0,
    });
  });
});

describe('rendasRepo.marcarRecebida', () => {
  it('não duplica a baixa e guarda o último valor informado', async () => {
    const db = await criarBanco();
    const id = await rendasRepo.criar(db, {
      nome: 'Freela',
      valor_centavos: 100000,
      dia_recebimento: 20,
      tipo: 'variavel',
      mes_ref: null,
      ativa: 1,
    });

    await rendasRepo.marcarRecebida(db, id, '2026-05', 90000);
    await rendasRepo.marcarRecebida(db, id, '2026-05', 95000);

    const recebidas = await rendasRepo.listarRecebidasDoMes(db, '2026-05');
    expect(recebidas).toHaveLength(1);
    expect(recebidas[0].valor_centavos).toBe(95000);
  });
});

describe('lancamentosRepo.garantirMes', () => {
  it('cria o lançamento da conta fixa uma vez só', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);

    await lancamentosRepo.garantirMes(db, '2026-03');
    await lancamentosRepo.garantirMes(db, '2026-03');

    const lancamentos = await lancamentosRepo.listarPorConta(db, contaId);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]).toMatchObject({ mes_ref: '2026-03', vencimento: '2026-03-10' });
  });

  it('usa o último dia do mês quando o vencimento é 31', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db, { dia_vencimento: 31, data_inicio: '2026-01-31' });

    await lancamentosRepo.garantirMes(db, '2026-02');

    expect((await lancamentosRepo.listarPorConta(db, contaId))[0].vencimento).toBe('2026-02-28');
  });

  it('conta sem vencimento fica no último dia do mês', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db, { dia_vencimento: null, sem_vencimento: 1 });

    await lancamentosRepo.garantirMes(db, '2026-04');

    expect((await lancamentosRepo.listarPorConta(db, contaId))[0].vencimento).toBe('2026-04-30');
  });

  it('não cria antes do início nem depois do fim da conta', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db, { data_fim: '2026-03-31' });

    await lancamentosRepo.garantirMes(db, '2025-12');
    await lancamentosRepo.garantirMes(db, '2026-04');

    expect(await lancamentosRepo.listarPorConta(db, contaId)).toHaveLength(0);
  });

  it('não cria lançamento de contas únicas e parceladas', async () => {
    const db = await criarBanco();
    await criarConta(db, { tipo: 'unica', dia_vencimento: null, data_unica: '2026-03-15' });
    await criarConta(db, { tipo: 'parcelada', parcelas_total: 3 });

    await lancamentosRepo.garantirMes(db, '2026-03');

    expect(await db.getAllAsync('SELECT * FROM lancamentos;')).toHaveLength(0);
  });

  it('não recria o mês excluído com "só este mês"', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);
    await lancamentosRepo.garantirMes(db, '2026-03');
    const [marco] = await lancamentosRepo.listarPorConta(db, contaId);

    await lancamentosRepo.excluirSoDesteMes(db, marco);
    await lancamentosRepo.garantirMes(db, '2026-03');
    await lancamentosRepo.garantirMes(db, '2026-04');

    const meses = (await lancamentosRepo.listarPorConta(db, contaId)).map((l) => l.mes_ref);
    expect(meses).toEqual(['2026-04']);
  });

  it('repete a divisão da conta compartilhada no mês novo', async () => {
    const db = await criarBanco();
    const anaId = await pessoasRepo.criar(db, 'Ana');
    const contaId = await criarConta(db, { compartilhada: 1, valor_centavos: 15000 });
    const janeiro = await criarLancamento(db, contaId, '2026-01', 1, 10000);
    await divisoesRepo.salvarDivisoes(db, janeiro, [
      { pessoa_id: 1, valor_centavos: 6000 },
      { pessoa_id: anaId, valor_centavos: 4000 },
    ]);

    await lancamentosRepo.garantirMes(db, '2026-02');

    const fevereiro = await lancamentosRepo.buscarPorContaEMes(db, contaId, '2026-02');
    const divisoes = await divisoesRepo.listarPorLancamento(db, fevereiro!.id);
    expect(divisoes.map((d) => [d.pessoa_nome, d.valor_centavos])).toEqual([
      ['Eu', 9000],
      ['Ana', 6000],
    ]);
  });
});

describe('contasRepo.encerrarAPartirDe', () => {
  it('mantém o histórico pago e encerra a conta no mês anterior', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);
    await criarLancamento(db, contaId, '2026-01', 1);
    await criarLancamento(db, contaId, '2026-02');
    await criarLancamento(db, contaId, '2026-03');

    await contasRepo.encerrarAPartirDe(db, contaId, '2026-02');
    await lancamentosRepo.garantirMes(db, '2026-04');

    const meses = (await lancamentosRepo.listarPorConta(db, contaId)).map((l) => l.mes_ref);
    expect(meses).toEqual(['2026-01']);
    expect((await contasRepo.buscarPorId(db, contaId))?.data_fim).toBe('2026-01-31');
  });

  it('apaga a conta quando não sobra nenhum lançamento', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);
    await criarLancamento(db, contaId, '2026-02');

    await contasRepo.encerrarAPartirDe(db, contaId, '2026-02');

    expect(await contasRepo.buscarPorId(db, contaId)).toBeNull();
  });
});

describe('lancamentosRepo.atualizarValorNaoPagosAPartirDe', () => {
  it('muda só os não pagos a partir do mês', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);
    await criarLancamento(db, contaId, '2026-01');
    await criarLancamento(db, contaId, '2026-02', 1);
    await criarLancamento(db, contaId, '2026-03');

    await lancamentosRepo.atualizarValorNaoPagosAPartirDe(db, contaId, '2026-02', 12000);

    const valores = (await lancamentosRepo.listarPorConta(db, contaId)).map(
      (l) => l.valor_centavos
    );
    expect(valores).toEqual([10000, 10000, 12000]);
  });
});

describe('lancamentosRepo.atualizarDiaNaoPagosAPartirDe', () => {
  it('muda o vencimento dos não pagos a partir do mês, ajustando o dia 31', async () => {
    const db = await criarBanco();
    const contaId = await criarConta(db);
    await criarLancamento(db, contaId, '2026-01');
    await criarLancamento(db, contaId, '2026-02');
    await criarLancamento(db, contaId, '2026-03', 1);

    await lancamentosRepo.atualizarDiaNaoPagosAPartirDe(db, contaId, '2026-02', 31);

    const vencimentos = (await lancamentosRepo.listarPorConta(db, contaId)).map(
      (l) => l.vencimento
    );
    expect(vencimentos).toEqual(['2026-01-10', '2026-02-28', '2026-03-10']);
  });
});

describe('backupRepo', () => {
  async function popular(db: SQLiteDatabase) {
    const contaId = await criarConta(db, { compartilhada: 1 });
    const lancamentoId = await criarLancamento(db, contaId, '2026-01', 1);
    const anaId = await pessoasRepo.criar(db, 'Ana');
    await divisoesRepo.salvarDivisoes(db, lancamentoId, [
      { pessoa_id: 1, valor_centavos: 5000 },
      { pessoa_id: anaId, valor_centavos: 5000 },
    ]);
    const rendaId = await rendasRepo.criar(db, {
      nome: '13º',
      valor_centavos: 300000,
      dia_recebimento: 20,
      tipo: 'pontual',
      mes_ref: '2026-12',
      ativa: 1,
    });
    await rendasRepo.marcarRecebida(db, rendaId, '2026-12', 300000);
  }

  it('importa em outro celular exatamente o que foi exportado', async () => {
    const origem = await criarBanco();
    await popular(origem);
    const backup = await backupRepo.exportarTudo(origem, VERSAO_BANCO);

    const destino = await criarBanco();
    await backupRepo.importarTudo(destino, JSON.parse(JSON.stringify(backup)));

    const reexportado = await backupRepo.exportarTudo(destino, VERSAO_BANCO);
    expect(reexportado.tabelas).toEqual(backup.tabelas);
  });

  it('substitui os dados que já existiam', async () => {
    const vazio = await backupRepo.exportarTudo(await criarBanco(), VERSAO_BANCO);
    const db = await criarBanco();
    await popular(db);

    await backupRepo.importarTudo(db, vazio);

    expect(await db.getAllAsync('SELECT * FROM contas;')).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM rendas;')).toHaveLength(0);
  });

  it('não muda nada quando o backup tem dados inconsistentes', async () => {
    const db = await criarBanco();
    await popular(db);
    const antes = await backupRepo.exportarTudo(db, VERSAO_BANCO);

    const quebrado = await backupRepo.exportarTudo(db, VERSAO_BANCO);
    quebrado.tabelas.lancamentos.push({ ...quebrado.tabelas.lancamentos[0], id: 99, conta_id: 999 });

    await expect(backupRepo.importarTudo(db, quebrado)).rejects.toThrow();
    expect((await backupRepo.exportarTudo(db, VERSAO_BANCO)).tabelas).toEqual(antes.tabelas);
  });

  it('importa backup da v2, de antes da opção sem vencimento', async () => {
    const origem = await criarBanco();
    await popular(origem);
    const backup = await backupRepo.exportarTudo(origem, VERSAO_BANCO);
    backup.versaoBanco = 2;
    backup.tabelas.contas = backup.tabelas.contas.map(
      ({ sem_vencimento: _semVencimento, ...c }) => c
    );

    const destino = await criarBanco();
    await backupRepo.importarTudo(destino, backup);

    expect((await contasRepo.listarTodas(destino))[0].sem_vencimento).toBe(0);
  });

  it('ignora colunas desconhecidas e importa backup da v1 sem mes_ref', async () => {
    const origem = await criarBanco();
    await popular(origem);
    const backup = await backupRepo.exportarTudo(origem, VERSAO_BANCO);
    backup.versaoBanco = 1;
    backup.tabelas.rendas = backup.tabelas.rendas.map(({ mes_ref: _mesRef, ...r }) => ({
      ...r,
      coluna_estranha: 'x',
    }));

    const destino = await criarBanco();
    await backupRepo.importarTudo(destino, backup);

    expect((await rendasRepo.listarTodas(destino))[0]).toMatchObject({ nome: '13º', mes_ref: null });
  });
});

describe('previsaoRepo', () => {
  it('carrega lançamentos com a minha parte, a média das variáveis e a fração dividida', async () => {
    const db = await criarBanco();
    const anaId = await pessoasRepo.criar(db, 'Ana');

    // Conta dividida meio a meio
    const aluguel = await criarConta(db, { nome: 'Aluguel', compartilhada: 1, valor_centavos: 200000 });
    const lAluguel = await criarLancamento(db, aluguel, '2026-11', 0, 200000);
    await divisoesRepo.salvarDivisoes(db, lAluguel, [
      { pessoa_id: 1, valor_centavos: 100000 },
      { pessoa_id: anaId, valor_centavos: 100000 },
    ]);

    // Variável com dois meses pagos (100 e 200)
    const luz = await criarConta(db, { nome: 'Luz', tipo: 'variavel' });
    await criarLancamento(db, luz, '2026-09', 1, 10000);
    await criarLancamento(db, luz, '2026-10', 1, 20000);

    const dados = await previsaoRepo.carregar(db, '2026-11', 6, 3);

    expect(dados.lancamentos).toEqual([
      { id: lAluguel, conta_id: aluguel, mes_ref: '2026-11', valor_centavos: 200000, minha_parte_centavos: 100000 },
    ]);
    expect(dados.mediaVariaveis[luz]).toBe(15000);
    expect(dados.fracaoMinhaParte[aluguel]).toBe(0.5);
  });

  it('lista a última parcela de cada parcelamento', async () => {
    const db = await criarBanco();
    const celular = await criarConta(db, { nome: 'Celular', tipo: 'parcelada', parcelas_total: 3 });
    await criarLancamento(db, celular, '2026-10', 1);
    await criarLancamento(db, celular, '2026-11', 0);
    await criarLancamento(db, celular, '2026-12', 0);

    expect(await previsaoRepo.ultimasParcelas(db)).toEqual([
      { conta_id: celular, nome: 'Celular', ultimo_mes: '2026-12', valor_parcela_centavos: 10000, parcelas_restantes: 2 },
    ]);
  });
});

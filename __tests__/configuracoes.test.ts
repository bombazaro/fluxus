import {
  CONFIG_PADRAO,
  lerConfiguracoes,
  serializarConfiguracoes,
} from '../src/domain/configuracoes';
import { configuracoesRepo } from '../src/db/repositorios/configuracoesRepo';
import { backupRepo } from '../src/db/repositorios/backupRepo';
import { VERSAO_BANCO } from '../src/db/migrations';
import { criarBanco } from './helpers/bancoEmMemoria';

describe('lerConfiguracoes', () => {
  it('usa os padrões quando não há nada salvo', () => {
    expect(lerConfiguracoes([])).toEqual(CONFIG_PADRAO);
  });

  it('lê os valores salvos', () => {
    const config = lerConfiguracoes([
      { chave: 'tema', valor: 'escuro' },
      { chave: 'notificacoesAtivas', valor: '1' },
      { chave: 'notificacaoHora', valor: '20' },
      { chave: 'usarSobraDoMesAnterior', valor: '0' },
    ]);
    expect(config).toMatchObject({
      tema: 'escuro',
      notificacoesAtivas: true,
      notificacaoHora: 20,
      usarSobraDoMesAnterior: false,
    });
  });

  it('ignora valores inválidos e chaves desconhecidas', () => {
    const config = lerConfiguracoes([
      { chave: 'tema', valor: 'roxo' },
      { chave: 'notificacaoHora', valor: '25' },
      { chave: 'mesesMedia', valor: 'abc' },
      { chave: 'notificacoesAtivas', valor: 'sim' },
      { chave: 'outraCoisa', valor: '1' },
    ]);
    expect(config).toEqual(CONFIG_PADRAO);
  });

  it('serializa booleanos como 0/1 e números como texto', () => {
    expect(serializarConfiguracoes({ notificacoesAtivas: true, notificacaoHora: 8 })).toEqual([
      { chave: 'notificacoesAtivas', valor: '1' },
      { chave: 'notificacaoHora', valor: '8' },
    ]);
  });
});

describe('configuracoesRepo', () => {
  it('salva, atualiza e lê de volta', async () => {
    const db = await criarBanco();
    expect(await configuracoesRepo.obter(db)).toEqual(CONFIG_PADRAO);

    await configuracoesRepo.salvar(db, { tema: 'claro', mesesMedia: 6 });
    await configuracoesRepo.salvar(db, { mesesMedia: 3, onboardingConcluido: true });

    expect(await configuracoesRepo.obter(db)).toEqual({
      ...CONFIG_PADRAO,
      tema: 'claro',
      mesesMedia: 3,
      onboardingConcluido: true,
    });
  });

  it('sabe se já há contas ou rendas cadastradas', async () => {
    const db = await criarBanco();
    expect(await configuracoesRepo.temDados(db)).toBe(false);
    await db.runAsync(
      "INSERT INTO rendas (nome, valor_centavos, dia_recebimento, tipo, ativa, criado_em) VALUES ('Salário', 300000, 30, 'fixa', 1, '2026-10-01');"
    );
    expect(await configuracoesRepo.temDados(db)).toBe(true);
  });

  it('as configurações vão junto no backup', async () => {
    const origem = await criarBanco();
    await configuracoesRepo.salvar(origem, { tema: 'escuro' });
    const backup = await backupRepo.exportarTudo(origem, VERSAO_BANCO);

    const destino = await criarBanco();
    await backupRepo.importarTudo(destino, backup);

    expect((await configuracoesRepo.obter(destino)).tema).toBe('escuro');
  });
});

import { nomeArquivoBackup, validarBackup } from '../src/domain/backup';

describe('validarBackup', () => {
  const backupValido = {
    app: 'fluxus',
    versaoBanco: 2,
    exportadoEm: '2026-10-20T12:00:00.000Z',
    tabelas: {
      contas: [{ id: 1, nome: 'Aluguel', data_fim: null }],
      lancamentos: [],
    },
  };

  it('aceita um backup válido', () => {
    const resultado = validarBackup(backupValido, 2);
    expect(resultado.ok).toBe(true);
  });

  it('aceita backup de uma versão anterior do banco', () => {
    expect(validarBackup({ ...backupValido, versaoBanco: 1 }, 2).ok).toBe(true);
  });

  it('recusa arquivo que não é do Fluxus', () => {
    const resultado = validarBackup({ foo: 'bar' }, 2);
    expect(resultado).toEqual({ ok: false, erro: 'Este arquivo não é um backup do Fluxus.' });
  });

  it('recusa backup de versão mais nova do banco', () => {
    const resultado = validarBackup({ ...backupValido, versaoBanco: 3 }, 2);
    expect(resultado.ok).toBe(false);
  });

  it('recusa tabela que não é lista', () => {
    const resultado = validarBackup(
      { ...backupValido, tabelas: { contas: { id: 1 } } },
      2
    );
    expect(resultado.ok).toBe(false);
  });

  it('recusa valores que não são texto, número ou nulo', () => {
    const resultado = validarBackup(
      { ...backupValido, tabelas: { contas: [{ id: 1, nome: { x: 1 } }] } },
      2
    );
    expect(resultado.ok).toBe(false);
  });

  it('recusa conteúdo que não é objeto', () => {
    expect(validarBackup(null, 2).ok).toBe(false);
    expect(validarBackup([], 2).ok).toBe(false);
  });
});

describe('nomeArquivoBackup', () => {
  it('inclui a data no nome do arquivo', () => {
    expect(nomeArquivoBackup('2026-10-20')).toBe('fluxus-backup-2026-10-20.json');
  });
});

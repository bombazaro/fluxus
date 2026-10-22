export type ValorColuna = string | number | null;
export type LinhaBackup = Record<string, ValorColuna>;

/**
 * Arquivo de backup do Fluxus: todas as tabelas do banco em JSON.
 * versaoBanco é o user_version de quando foi exportado.
 */
export interface BackupFluxus {
  app: 'fluxus';
  versaoBanco: number;
  exportadoEm: string;
  tabelas: Record<string, LinhaBackup[]>;
}

export type ResultadoValidacao = { ok: true; backup: BackupFluxus } | { ok: false; erro: string };

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehLinhaValida(linha: unknown): linha is LinhaBackup {
  if (!ehObjeto(linha)) return false;
  return Object.values(linha).every(
    (v) => v === null || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))
  );
}

/**
 * Confere se o conteúdo lido de um arquivo é um backup do Fluxus que este app
 * consegue importar. Não confia em nada do arquivo antes de validar.
 */
export function validarBackup(conteudo: unknown, versaoBancoAtual: number): ResultadoValidacao {
  if (!ehObjeto(conteudo) || conteudo.app !== 'fluxus') {
    return { ok: false, erro: 'Este arquivo não é um backup do Fluxus.' };
  }

  const { versaoBanco, exportadoEm, tabelas } = conteudo;

  if (typeof versaoBanco !== 'number' || !Number.isInteger(versaoBanco) || versaoBanco < 1) {
    return { ok: false, erro: 'O backup está corrompido (versão inválida).' };
  }
  if (versaoBanco > versaoBancoAtual) {
    return {
      ok: false,
      erro: 'Este backup veio de uma versão mais nova do Fluxus. Atualize o app antes de importar.',
    };
  }
  if (typeof exportadoEm !== 'string' || !ehObjeto(tabelas)) {
    return { ok: false, erro: 'O backup está corrompido (estrutura inválida).' };
  }

  for (const [nome, linhas] of Object.entries(tabelas)) {
    if (!Array.isArray(linhas) || !linhas.every(ehLinhaValida)) {
      return { ok: false, erro: `O backup está corrompido (tabela ${nome}).` };
    }
  }

  return {
    ok: true,
    backup: {
      app: 'fluxus',
      versaoBanco,
      exportadoEm,
      tabelas: tabelas as Record<string, LinhaBackup[]>,
    },
  };
}

/** Nome do arquivo exportado: fluxus-backup-2026-10-20.json */
export function nomeArquivoBackup(hojeIso: string): string {
  return `fluxus-backup-${hojeIso}.json`;
}

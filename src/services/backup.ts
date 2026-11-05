import { SQLiteDatabase } from 'expo-sqlite';
import { backupRepo } from '@/src/db/repositorios/backupRepo';
import { nomeArquivoBackup, validarBackup, VERSAO_BACKUP } from '@/src/domain/backup';
import { obterHojeIso } from '@/src/store/useMesStore';
import { entregarArquivo, escolherArquivoTexto } from '@/src/services/arquivos';

/** Gera o arquivo de backup e o entrega: menu de compartilhar no celular, download na web. */
export async function exportarBackup(db: SQLiteDatabase): Promise<void> {
  const backup = await backupRepo.exportarTudo(db, VERSAO_BACKUP);
  await entregarArquivo(nomeArquivoBackup(obterHojeIso()), JSON.stringify(backup));
}

export type ResultadoImportacao =
  | { status: 'cancelado' }
  | { status: 'erro'; mensagem: string }
  | { status: 'ok'; exportadoEm: string };

/**
 * Pede ao usuário um arquivo de backup, valida e substitui todos os dados.
 * Quem chama deve confirmar com o usuário antes, porque os dados atuais somem.
 */
export async function importarBackup(db: SQLiteDatabase): Promise<ResultadoImportacao> {
  const texto = await escolherArquivoTexto();
  if (texto === null) return { status: 'cancelado' };

  let conteudo: unknown;
  try {
    conteudo = JSON.parse(texto);
  } catch {
    return {
      status: 'erro',
      mensagem: 'Não foi possível ler o arquivo. Ele é um backup do Fluxus?',
    };
  }

  const validacao = validarBackup(conteudo, VERSAO_BACKUP);
  if (!validacao.ok) return { status: 'erro', mensagem: validacao.erro };

  await backupRepo.importarTudo(db, validacao.backup);
  return { status: 'ok', exportadoEm: validacao.backup.exportadoEm };
}

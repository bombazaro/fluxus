import { SQLiteDatabase } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { backupRepo } from '@/src/db/repositorios/backupRepo';
import { VERSAO_BANCO } from '@/src/db/migrations';
import { nomeArquivoBackup, validarBackup } from '@/src/domain/backup';
import { obterHojeIso } from '@/src/store/useMesStore';

/** Gera o arquivo de backup e abre o menu de compartilhar (Drive, WhatsApp, e-mail...). */
export async function exportarBackup(db: SQLiteDatabase): Promise<void> {
  const backup = await backupRepo.exportarTudo(db, VERSAO_BANCO);

  const arquivo = new File(Paths.cache, nomeArquivoBackup(obterHojeIso()));
  arquivo.create({ overwrite: true });
  await arquivo.write(JSON.stringify(backup));

  await Sharing.shareAsync(arquivo.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar backup do Fluxus',
  });
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
  const escolha = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (escolha.canceled) return { status: 'cancelado' };

  let conteudo: unknown;
  try {
    conteudo = JSON.parse(await new File(escolha.assets[0].uri).text());
  } catch {
    return {
      status: 'erro',
      mensagem: 'Não foi possível ler o arquivo. Ele é um backup do Fluxus?',
    };
  }

  const validacao = validarBackup(conteudo, VERSAO_BANCO);
  if (!validacao.ok) return { status: 'erro', mensagem: validacao.erro };

  await backupRepo.importarTudo(db, validacao.backup);
  return { status: 'ok', exportadoEm: validacao.backup.exportadoEm };
}

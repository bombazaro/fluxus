import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

/** Versão do celular: grava na pasta temporária e abre o menu de compartilhar. */

/** Salva o conteúdo num arquivo e abre o menu de compartilhar (Drive, WhatsApp, e-mail...). */
export async function entregarArquivo(nome: string, conteudo: string): Promise<void> {
  const arquivo = new File(Paths.cache, nome);
  arquivo.create({ overwrite: true });
  await arquivo.write(conteudo);

  await Sharing.shareAsync(arquivo.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar backup do Fluxus',
  });
}

/** Pede um arquivo ao usuário e devolve o texto dele, ou null se cancelar. */
export async function escolherArquivoTexto(): Promise<string | null> {
  const escolha = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (escolha.canceled) return null;
  return new File(escolha.assets[0].uri).text();
}

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  ClienteAuth,
  entrarComGoogle,
  entrarComGoogleNoCelular,
  enderecoDeRetornoDoGoogle,
  Usuario,
} from '@/src/services/conta';

/**
 * Começa o login do Google em qualquer plataforma.
 * - Web: a página sai para o Google e volta recarregada; devolve null (nada a fazer depois).
 * - Celular: abre o navegador do sistema e devolve quem entrou, ou null se a pessoa desistiu.
 * Quem recebe o usuário precisa ligar este aparelho à conta (tela de conta).
 */
export async function iniciarEntradaComGoogle(auth: ClienteAuth): Promise<Usuario | null> {
  if (Platform.OS === 'web') {
    await entrarComGoogle(auth, enderecoDeRetornoDoGoogle());
    return null;
  }
  return entrarComGoogleNoCelular(
    auth,
    (url, voltarPara) => WebBrowser.openAuthSessionAsync(url, voltarPara),
    Linking.createURL('conta-sincronizada')
  );
}

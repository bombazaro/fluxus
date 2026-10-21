import { Alert, Linking } from 'react-native';
import { pedirPermissao } from '@/src/services/notificacoes';

/**
 * Explica por que o app quer mandar notificações antes do pedido do sistema
 * (o Android só deixa pedir algumas vezes). Devolve se a permissão foi dada.
 */
export function pedirPermissaoComExplicacao(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Lembretes de vencimento',
      'O Fluxus avisa um pouco antes de cada conta vencer, para nada passar do prazo. ' +
        'Os avisos são criados no próprio celular: nada sai do aparelho.',
      [
        { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Permitir',
          onPress: async () => {
            const permitido = await pedirPermissao();
            if (!permitido) {
              Alert.alert(
                'Notificações bloqueadas',
                'Para receber os lembretes, libere as notificações do Fluxus nas configurações do celular.',
                [
                  { text: 'Agora não', style: 'cancel' },
                  { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
                ]
              );
            }
            resolve(permitido);
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

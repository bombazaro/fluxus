import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

/** Mesma forma do botão do Alert.alert, para a troca ser direta. */
export interface BotaoAviso {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface OpcoesAviso {
  cancelable?: boolean;
  /** Chamado quando a pessoa fecha o aviso sem tocar em um botão (ex.: voltar). */
  onDismiss?: () => void;
}

export interface BotaoPedido {
  text: string;
  style: 'default' | 'cancel' | 'destructive';
  aoToque: () => void;
}

export interface PedidoAviso {
  titulo: string;
  mensagem?: string;
  botoes: BotaoPedido[];
  aoDispensar: () => void;
}

interface AvisoState {
  pedido: PedidoAviso | null;
}

export const useAvisoStore = create<AvisoState>(() => ({ pedido: null }));

export function fecharAviso() {
  useAvisoStore.setState({ pedido: null });
}

/**
 * Mostra um aviso ou uma confirmação. No celular usa o Alert nativo; na web, onde o
 * Alert.alert não faz nada, abre o componente Dialogo.
 */
export function avisar(
  titulo: string,
  mensagem?: string,
  botoes?: BotaoAviso[],
  opcoes?: OpcoesAviso
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(titulo, mensagem, botoes, opcoes);
    return;
  }
  const lista = botoes && botoes.length > 0 ? botoes : [{ text: 'Ok' }];
  useAvisoStore.setState({
    pedido: {
      titulo,
      mensagem,
      aoDispensar: () => {
        fecharAviso();
        opcoes?.onDismiss?.();
      },
      botoes: lista.map((b) => ({
        text: b.text,
        style: b.style ?? 'default',
        aoToque: () => {
          fecharAviso();
          b.onPress?.();
        },
      })),
    },
  });
}

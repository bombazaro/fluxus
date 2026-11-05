import { Alert, Platform } from 'react-native';
import { avisar, fecharAviso, useAvisoStore } from '@/src/utils/avisar';

describe('avisar', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    fecharAviso();
  });

  it('no celular usa o Alert nativo', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const botoes = [{ text: 'Ok' }];
    const opcoes = { cancelable: true };
    avisar('Título', 'Mensagem', botoes, opcoes);
    expect(alerta).toHaveBeenCalledWith('Título', 'Mensagem', botoes, opcoes);
    expect(useAvisoStore.getState().pedido).toBeNull();
  });

  describe('na web', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'web');
    });

    it('publica o pedido e o botão chama onPress uma vez e fecha', () => {
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const onPress = jest.fn();
      avisar('Excluir?', 'x', [{ text: 'Excluir', style: 'destructive', onPress }]);
      expect(alerta).not.toHaveBeenCalled();
      const pedido = useAvisoStore.getState().pedido;
      expect(pedido?.titulo).toBe('Excluir?');
      pedido?.botoes[0].aoToque();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(useAvisoStore.getState().pedido).toBeNull();
    });

    it('fechar sem tocar em botão chama onDismiss', () => {
      const onDismiss = jest.fn();
      avisar('Permissão', undefined, [{ text: 'Ok' }], { onDismiss });
      useAvisoStore.getState().pedido?.aoDispensar();
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(useAvisoStore.getState().pedido).toBeNull();
    });

    it('sem botões mostra um Ok que só fecha', () => {
      avisar('Aviso');
      const pedido = useAvisoStore.getState().pedido;
      expect(pedido?.botoes.map((b) => b.text)).toEqual(['Ok']);
      pedido?.botoes[0].aoToque();
      expect(useAvisoStore.getState().pedido).toBeNull();
    });
  });
});

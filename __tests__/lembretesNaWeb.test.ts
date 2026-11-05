const config = { notificacoesAtivas: true, notificacaoHora: 9 * 60, notificacaoDiasAntes: 1 };

function carregar(os: 'web' | 'android') {
  const notificacoes = {
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setNotificationCategoryAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    AndroidImportance: { HIGH: 4 },
  };
  let modulo!: typeof import('@/src/services/notificacoes');
  jest.isolateModules(() => {
    jest.doMock('expo-notifications', () => notificacoes);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.replaceProperty(require('react-native').Platform, 'OS', os);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('@/src/services/notificacoes');
  });
  return { modulo, notificacoes };
}

describe('lembretes fora do celular', () => {
  afterEach(() => jest.restoreAllMocks());

  it('na web ficam indisponíveis e não chamam o expo-notifications', async () => {
    const { modulo, notificacoes } = carregar('web');

    expect(modulo.lembretesDisponiveis).toBe(false);
    modulo.configurarNotificacoes();
    await modulo.reagendarLembretes({} as never, config);
    expect(await modulo.pedirPermissao()).toBe(false);
    expect(await modulo.temPermissao()).toBe(false);
    expect(notificacoes.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(notificacoes.setNotificationHandler).not.toHaveBeenCalled();
    expect(notificacoes.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('no celular ficam disponíveis e configuram o handler', () => {
    const { modulo, notificacoes } = carregar('android');
    expect(modulo.lembretesDisponiveis).toBe(true);
    modulo.configurarNotificacoes();
    expect(notificacoes.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

import {
  confirmarCodigo,
  ClienteAuth,
  entrarComEmail,
  entrarComGoogle,
  entrarComGoogleNoCelular,
  lerSessaoDaVolta,
  sair,
  usuarioAtual,
  validarEmail,
} from '../src/services/conta';

function auth(sobre: Partial<ClienteAuth> = {}): jest.Mocked<ClienteAuth> {
  return {
    signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    verifyOtp: jest
      .fn()
      .mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
    setSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com' } } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    ...sobre,
  } as jest.Mocked<ClienteAuth>;
}

describe('validarEmail', () => {
  it.each(['', 'ana', 'ana@', '@x.com', 'ana@x', 'a b@x.com'])('recusa %p', (e) => {
    expect(validarEmail(e)).toBe(false);
  });
  it('aceita e-mail comum, com espaços nas pontas', () => {
    expect(validarEmail('  ana@exemplo.com ')).toBe(true);
  });
});

describe('entrarComEmail', () => {
  it('e-mail inválido é recusado antes de chamar a rede', async () => {
    const a = auth();
    await expect(entrarComEmail(a, 'ana')).rejects.toThrow('e-mail');
    expect(a.signInWithOtp).not.toHaveBeenCalled();
  });

  it('envia o código para o e-mail em minúsculas e sem espaços', async () => {
    const a = auth();
    await entrarComEmail(a, '  Ana@Exemplo.com ');
    expect(a.signInWithOtp).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      options: { shouldCreateUser: true },
    });
  });

  it('erro de rede vira mensagem em português', async () => {
    const a = auth({ signInWithOtp: jest.fn().mockRejectedValue(new Error('fetch failed')) });
    await expect(entrarComEmail(a, 'ana@x.com')).rejects.toThrow(/conexão/i);
  });

  it('limite de envios do servidor vira aviso claro', async () => {
    const a = auth({
      signInWithOtp: jest.fn().mockResolvedValue({
        error: { message: 'rate limit', status: 429, code: 'over_email_send_rate_limit' },
      }),
    });
    await expect(entrarComEmail(a, 'ana@x.com')).rejects.toThrow(/aguarde/i);
  });
});

describe('confirmarCodigo', () => {
  it('código errado mostra "Código incorreto" e não devolve usuário', async () => {
    const a = auth({
      verifyOtp: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired or is invalid' },
      }),
    });
    await expect(confirmarCodigo(a, 'ana@x.com', '123456')).rejects.toThrow('Código incorreto');
  });

  it('código fora do formato nem chega na rede', async () => {
    const a = auth();
    await expect(confirmarCodigo(a, 'ana@x.com', '12')).rejects.toThrow('Código incorreto');
    expect(a.verifyOtp).not.toHaveBeenCalled();
  });

  it('código de 8 dígitos (tamanho atual do servidor) é aceito', async () => {
    const a = auth();
    await confirmarCodigo(a, 'ana@x.com', '12345678');
    expect(a.verifyOtp).toHaveBeenCalledWith({
      email: 'ana@x.com',
      token: '12345678',
      type: 'email',
    });
  });

  it('código certo devolve o usuário', async () => {
    const a = auth();
    await expect(confirmarCodigo(a, 'Ana@x.com', ' 123456 ')).resolves.toEqual({
      id: 'u1',
      email: 'a@b.com',
    });
    expect(a.verifyOtp).toHaveBeenCalledWith({
      email: 'ana@x.com',
      token: '123456',
      type: 'email',
    });
  });
});

describe('sair e usuarioAtual', () => {
  it('sair encerra a sessão', async () => {
    const a = auth();
    await sair(a);
    expect(a.signOut).toHaveBeenCalled();
  });

  it('sem sessão não há usuário', async () => {
    expect(await usuarioAtual(auth())).toBeNull();
  });

  it('com sessão devolve id e e-mail', async () => {
    const a = auth({
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'u9', email: 'x@y.com' } } } }),
    });
    expect(await usuarioAtual(a)).toEqual({ id: 'u9', email: 'x@y.com' });
  });
});

describe('entrarComGoogle', () => {
  it('pede o login do Google e diz para onde voltar', async () => {
    const a = auth();
    await entrarComGoogle(a, 'https://site.exemplo/conta-sincronizada');
    expect(a.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://site.exemplo/conta-sincronizada' },
    });
  });

  it('erro do servidor vira mensagem simples', async () => {
    const a = auth({
      signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: { message: 'x' } }),
    });
    await expect(entrarComGoogle(a, 'https://s')).rejects.toThrow(/Google/);
  });

  it('falha de rede vira mensagem de conexão', async () => {
    const a = auth({ signInWithOAuth: jest.fn().mockRejectedValue(new Error('rede')) });
    await expect(entrarComGoogle(a, 'https://s')).rejects.toThrow('Sem conexão');
  });
});

describe('lerSessaoDaVolta', () => {
  it('lê os tokens do fragmento da URL', () => {
    expect(
      lerSessaoDaVolta('fluxus://conta-sincronizada#access_token=AAA&refresh_token=RRR&x=1')
    ).toEqual({
      access_token: 'AAA',
      refresh_token: 'RRR',
    });
  });
  it('lê os tokens também quando vêm na query', () => {
    expect(
      lerSessaoDaVolta('fluxus://conta-sincronizada?access_token=AAA&refresh_token=RRR')
    ).toEqual({
      access_token: 'AAA',
      refresh_token: 'RRR',
    });
  });
  it.each([
    'fluxus://conta-sincronizada',
    'fluxus://c#error=access_denied',
    'fluxus://c#access_token=A',
  ])('devolve null sem os dois tokens (%p)', (url) => {
    expect(lerSessaoDaVolta(url)).toBeNull();
  });
});

describe('entrarComGoogleNoCelular', () => {
  const VOLTA = 'fluxus://conta-sincronizada';
  const comUrl = () =>
    auth({
      signInWithOAuth: jest
        .fn()
        .mockResolvedValue({ data: { url: 'https://google/login' }, error: null }),
    });

  it('abre o navegador, recebe os tokens e abre a sessão', async () => {
    const a = comUrl();
    const abrir = jest
      .fn()
      .mockResolvedValue({ type: 'success', url: `${VOLTA}#access_token=AAA&refresh_token=RRR` });
    const usuario = await entrarComGoogleNoCelular(a, abrir, VOLTA);
    expect(a.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: VOLTA, skipBrowserRedirect: true },
    });
    expect(abrir).toHaveBeenCalledWith('https://google/login', VOLTA);
    expect(a.setSession).toHaveBeenCalledWith({ access_token: 'AAA', refresh_token: 'RRR' });
    expect(usuario).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('devolve null quando a pessoa fecha o navegador sem entrar', async () => {
    const a = comUrl();
    const abrir = jest.fn().mockResolvedValue({ type: 'cancel' });
    expect(await entrarComGoogleNoCelular(a, abrir, VOLTA)).toBeNull();
    expect(a.setSession).not.toHaveBeenCalled();
  });

  it('volta sem tokens vira mensagem simples', async () => {
    const a = comUrl();
    const abrir = jest
      .fn()
      .mockResolvedValue({ type: 'success', url: `${VOLTA}#error=access_denied` });
    await expect(entrarComGoogleNoCelular(a, abrir, VOLTA)).rejects.toThrow(/Google/);
  });

  it('sem endereço de login do servidor, avisa', async () => {
    const a = auth();
    await expect(entrarComGoogleNoCelular(a, jest.fn(), VOLTA)).rejects.toThrow(/Google/);
  });

  it('erro ao abrir a sessão vira mensagem simples', async () => {
    const a = comUrl();
    a.setSession.mockResolvedValue({ data: { session: null }, error: { message: 'x' } });
    const abrir = jest
      .fn()
      .mockResolvedValue({ type: 'success', url: `${VOLTA}#access_token=A&refresh_token=R` });
    await expect(entrarComGoogleNoCelular(a, abrir, VOLTA)).rejects.toThrow(/Google/);
  });

  it('falha de rede vira mensagem de conexão', async () => {
    const a = auth({ signInWithOAuth: jest.fn().mockRejectedValue(new Error('rede')) });
    await expect(entrarComGoogleNoCelular(a, jest.fn(), VOLTA)).rejects.toThrow('Sem conexão');
  });
});

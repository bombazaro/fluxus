import {
  confirmarCodigo,
  ClienteAuth,
  entrarComEmail,
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
      signInWithOtp: jest
        .fn()
        .mockResolvedValue({
          error: { message: 'rate limit', status: 429, code: 'over_email_send_rate_limit' },
        }),
    });
    await expect(entrarComEmail(a, 'ana@x.com')).rejects.toThrow(/aguarde/i);
  });
});

describe('confirmarCodigo', () => {
  it('código errado mostra "Código incorreto" e não devolve usuário', async () => {
    const a = auth({
      verifyOtp: jest
        .fn()
        .mockResolvedValue({
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

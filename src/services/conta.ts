/** Usuário conectado. */
export interface Usuario {
  id: string;
  email: string;
}

type ErroAuth = { message: string; status?: number; code?: string } | null;

/** A parte do cliente de autenticação do Supabase que o app usa (facilita os testes). */
export interface ClienteAuth {
  signInWithOtp(args: {
    email: string;
    options?: { shouldCreateUser?: boolean };
  }): Promise<{ error: ErroAuth }>;
  verifyOtp(args: {
    email: string;
    token: string;
    type: 'email';
  }): Promise<{ data: { user: { id: string; email?: string } | null }; error: ErroAuth }>;
  signInWithOAuth(args: {
    provider: 'google';
    options?: { redirectTo?: string; skipBrowserRedirect?: boolean };
  }): Promise<{ data?: { url?: string | null }; error: ErroAuth }>;
  setSession(args: { access_token: string; refresh_token: string }): Promise<{
    data: { session: { user: { id: string; email?: string } } | null };
    error: ErroAuth;
  }>;
  signOut(): Promise<{ error: ErroAuth }>;
  getSession(): Promise<{
    data: { session: { user: { id: string; email?: string } } | null };
  }>;
}

const SEM_CONEXAO = 'Sem conexão com a internet. Tente de novo.';

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Envia por e-mail um código numérico (o servidor define o tamanho, hoje 8 dígitos). Cria a conta se for a primeira vez. */
export async function entrarComEmail(auth: ClienteAuth, email: string): Promise<void> {
  if (!validarEmail(email)) throw new Error('Digite um e-mail válido.');
  let erro: ErroAuth;
  try {
    ({ error: erro } = await auth.signInWithOtp({
      email: normalizarEmail(email),
      options: { shouldCreateUser: true },
    }));
  } catch {
    throw new Error(SEM_CONEXAO);
  }
  if (erro) {
    if (erro.status === 429 || /rate/i.test(erro.message + (erro.code ?? ''))) {
      throw new Error('Muitos pedidos de código. Aguarde alguns minutos e tente de novo.');
    }
    throw new Error('Não foi possível enviar o código. Confira o e-mail e tente de novo.');
  }
}

/**
 * Abre o login do Google. A página sai do app e volta em `voltarPara` já com a sessão aberta;
 * quem recebe a volta precisa ligar o aparelho à conta (veja a tela de conta).
 */
export async function entrarComGoogle(auth: ClienteAuth, voltarPara: string): Promise<void> {
  let erro: ErroAuth;
  try {
    ({ error: erro } = await auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: voltarPara },
    }));
  } catch {
    throw new Error(SEM_CONEXAO);
  }
  if (erro) throw new Error('Não foi possível entrar com o Google. Tente de novo.');
}

/** Abre o navegador do sistema e espera a volta ao app (no celular: `WebBrowser.openAuthSessionAsync`). */
export type AbrirNavegador = (
  url: string,
  voltarPara: string
) => Promise<{ type: string; url?: string }>;

/** Tokens que o Supabase devolve na URL de volta (no fragmento `#` ou, às vezes, na query). */
export function lerSessaoDaVolta(
  url: string
): { access_token: string; refresh_token: string } | null {
  const [semFragmento, fragmento = ''] = url.split('#');
  const query = semFragmento.split('?')[1] ?? '';
  for (const parte of [fragmento, query]) {
    const params = new URLSearchParams(parte);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) return { access_token, refresh_token };
  }
  return null;
}

/**
 * Login do Google no celular: abre o navegador do sistema, espera a volta para o app
 * (`voltarPara`, ex.: fluxus://conta-sincronizada) e abre a sessão com os tokens recebidos.
 * Devolve null se a pessoa fechou o navegador sem entrar.
 */
export async function entrarComGoogleNoCelular(
  auth: ClienteAuth,
  abrir: AbrirNavegador,
  voltarPara: string
): Promise<Usuario | null> {
  const FALHA = 'Não foi possível entrar com o Google. Tente de novo.';
  let url: string | null | undefined;
  try {
    const { data, error } = await auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: voltarPara, skipBrowserRedirect: true },
    });
    if (error) throw new Error(FALHA);
    url = data?.url;
  } catch (e) {
    throw e instanceof Error && e.message === FALHA ? e : new Error(SEM_CONEXAO);
  }
  if (!url) throw new Error(FALHA);

  const resultado = await abrir(url, voltarPara);
  if (resultado.type !== 'success' || !resultado.url) return null;
  const tokens = lerSessaoDaVolta(resultado.url);
  if (!tokens) throw new Error(FALHA);

  let sessao: Awaited<ReturnType<ClienteAuth['setSession']>>;
  try {
    sessao = await auth.setSession(tokens);
  } catch {
    throw new Error(SEM_CONEXAO);
  }
  const u = sessao.data.session?.user;
  if (sessao.error || !u) throw new Error(FALHA);
  return { id: u.id, email: u.email ?? '' };
}

/** Para onde o Google devolve a pessoa (só na web): a tela de conta, que liga o aparelho. */
export function enderecoDeRetornoDoGoogle(): string {
  return `${window.location.origin}/conta-sincronizada`;
}

/** Confere o código recebido por e-mail e abre a sessão. */
export async function confirmarCodigo(
  auth: ClienteAuth,
  email: string,
  codigo: string
): Promise<Usuario> {
  const token = codigo.trim();
  if (!/^\d{6,10}$/.test(token)) throw new Error('Código incorreto');
  let resposta;
  try {
    resposta = await auth.verifyOtp({ email: normalizarEmail(email), token, type: 'email' });
  } catch {
    throw new Error(SEM_CONEXAO);
  }
  const usuario = resposta.data.user;
  if (resposta.error || !usuario) throw new Error('Código incorreto');
  return { id: usuario.id, email: usuario.email ?? normalizarEmail(email) };
}

/** Encerra a sessão. Os dados deste aparelho continuam onde estão. */
export async function sair(auth: ClienteAuth): Promise<void> {
  await auth.signOut();
}

export async function usuarioAtual(auth: ClienteAuth): Promise<Usuario | null> {
  const { data } = await auth.getSession();
  const u = data.session?.user;
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

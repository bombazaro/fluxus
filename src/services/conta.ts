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

/** Envia por e-mail um código de 6 dígitos. Cria a conta se for a primeira vez. */
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

/** Confere o código recebido por e-mail e abre a sessão. */
export async function confirmarCodigo(
  auth: ClienteAuth,
  email: string,
  codigo: string
): Promise<Usuario> {
  const token = codigo.trim();
  if (!/^\d{6}$/.test(token)) throw new Error('Código incorreto');
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

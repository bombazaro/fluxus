import { Categoria } from '../../types';
import { categoriaPorNome, normalizarNome } from '../../domain/ia/categorias';
import { ResultadoInterpretacao, TEXTO_MAXIMO } from '../../domain/ia/tipos';
import { validarResposta } from '../../domain/ia/validar';

/** O pedaço do cliente do Supabase que usamos (facilita os testes). */
export interface ClienteFuncoes {
  functions: {
    invoke(
      nome: string,
      opcoes: { body: unknown; timeout?: number }
    ): Promise<{ data: unknown; error: unknown }>;
  };
}

export type CodigoErroIa = 'limite' | 'login' | 'sem_conexao' | 'indisponivel' | 'texto';

const MENSAGENS: Record<CodigoErroIa, string> = {
  limite: 'Você atingiu o limite de usos da IA por hoje. Tente amanhã ou cadastre à mão.',
  login: 'Entre na sua conta para usar a IA.',
  sem_conexao: 'Sem conexão com a internet. Use o cadastro manual.',
  indisponivel: 'A IA não respondeu agora. Tente de novo ou use o cadastro manual.',
  texto: `Escreva de 1 a ${TEXTO_MAXIMO} letras.`,
};

export class ErroIa extends Error {
  constructor(public readonly codigo: CodigoErroIa) {
    super(MENSAGENS[codigo]);
    this.name = 'ErroIa';
  }
}

const TEMPO_MAXIMO_MS = 12000;
const MINIMO_LETRAS_SUGESTAO = 3;

function traduzirErro(erro: unknown): ErroIa {
  const e = erro as { name?: string; context?: { status?: number } };
  if (e?.name === 'FunctionsFetchError') return new ErroIa('sem_conexao');
  if (e?.name === 'FunctionsHttpError') {
    const status = e.context?.status;
    if (status === 429) return new ErroIa('limite');
    if (status === 401) return new ErroIa('login');
  }
  return new ErroIa('indisponivel');
}

async function chamar(
  cliente: ClienteFuncoes,
  tarefa: 'categoria' | 'cadastro',
  texto: string,
  categorias: Categoria[],
  hoje: string
): Promise<Record<string, unknown>> {
  let resposta: { data: unknown; error: unknown };
  try {
    resposta = await cliente.functions.invoke('ia', {
      body: { tarefa, texto, categorias: categorias.map((c) => c.nome), hoje },
      timeout: TEMPO_MAXIMO_MS,
    });
  } catch (e) {
    throw traduzirErro(e);
  }
  if (resposta.error) throw traduzirErro(resposta.error);
  const resultado = (resposta.data as { resultado?: unknown } | null)?.resultado;
  if (typeof resultado !== 'object' || resultado === null) throw new ErroIa('indisponivel');
  return resultado as Record<string, unknown>;
}

// Mesmo nome, mesma sugestão: não gasta outro uso (vale até fechar o app)
const cacheDeSugestoes = new Map<string, number | null>();

export function limparCacheDeSugestoes(): void {
  cacheDeSugestoes.clear();
}

/**
 * Sugere a categoria de um gasto pelo nome. Nunca estoura erro: qualquer falha ou falta de
 * certeza vira null ("sem sugestão"), e a pessoa escolhe sozinha.
 */
export async function sugerirCategoria(
  cliente: ClienteFuncoes,
  nome: string,
  categorias: Categoria[],
  hoje: string
): Promise<number | null> {
  const chave = normalizarNome(nome);
  if (chave.length < MINIMO_LETRAS_SUGESTAO) return null;
  if (cacheDeSugestoes.has(chave)) return cacheDeSugestoes.get(chave) ?? null;
  try {
    const r = await chamar(cliente, 'categoria', nome.trim(), categorias, hoje);
    const id = categoriaPorNome(r.categoria, categorias);
    cacheDeSugestoes.set(chave, id);
    return id;
  } catch {
    return null;
  }
}

/** Interpreta uma frase ("paguei 150 de mercado ontem"). Estoura ErroIa se a IA não puder ajudar. */
export async function interpretarTexto(
  cliente: ClienteFuncoes,
  texto: string,
  categorias: Categoria[],
  hoje: string
): Promise<ResultadoInterpretacao> {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo || limpo.length > TEXTO_MAXIMO) throw new ErroIa('texto');
  const bruta = await chamar(cliente, 'cadastro', limpo, categorias, hoje);
  return validarResposta(bruta, { texto: limpo, hoje, categorias });
}

// Camada que fala com o provedor de IA. Trocar de provedor é mexer só aqui:
// o resto da função (login, limite, validação) e o app não mudam.
//
// Provedor atual: Groq (API compatível com a da OpenAI, plano gratuito, saída em JSON estrito).
// Segredos (Supabase › Edge Functions › Secrets), nunca no repositório:
//   GROQ_API_KEY   chave criada em console.groq.com/keys
//   GROQ_MODELO    opcional; padrão abaixo

const MODELO_PADRAO = 'openai/gpt-oss-20b';
const TEMPO_MAXIMO_MS = 10000;

export class ErroProvedor extends Error {}

export interface PerguntaAoProvedor {
  instrucao: string;
  texto: string;
  /** Esquema JSON da resposta (JSON Schema, modo estrito). */
  esquema: Record<string, unknown>;
}

/** Faz a pergunta e devolve o JSON da resposta (ainda não confiável). */
export async function perguntar(
  { instrucao, texto, esquema }: PerguntaAoProvedor,
  env: { get(nome: string): string | undefined }
): Promise<unknown> {
  const chave = env.get('GROQ_API_KEY');
  if (!chave) throw new ErroProvedor('GROQ_API_KEY não configurada');
  const modelo = env.get('GROQ_MODELO') || MODELO_PADRAO;

  const resposta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: 'system', content: instrucao },
        { role: 'user', content: texto },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'resposta', strict: true, schema: esquema },
      },
      temperature: 0,
      // o modelo "pensa" antes de responder; pouco raciocínio basta e custa menos tokens
      reasoning_effort: 'low',
      max_completion_tokens: 800,
    }),
    signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
  });
  // O modelo às vezes gera um JSON fora do esquema: a Groq recusa com 400. Tratamos como "não entendi".
  if (resposta.status === 400) return null;
  if (!resposta.ok) throw new ErroProvedor(`provedor respondeu ${resposta.status}`);

  const corpo = await resposta.json();
  const json = corpo?.choices?.[0]?.message?.content;
  if (typeof json !== 'string') throw new ErroProvedor('resposta sem texto');
  try {
    return JSON.parse(json);
  } catch {
    throw new ErroProvedor('resposta não é JSON');
  }
}

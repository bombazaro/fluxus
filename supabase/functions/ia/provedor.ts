// Camada que fala com o provedor de IA. Trocar de provedor é mexer só aqui:
// o resto da função (login, limite, validação) e o app não mudam.
//
// Segredos (Supabase › Edge Functions › Secrets), nunca no repositório:
//   GEMINI_API_KEY   chave criada em aistudio.google.com
//   GEMINI_MODELO    opcional; padrão abaixo

const MODELO_PADRAO = 'gemini-3.5-flash-lite';
const TEMPO_MAXIMO_MS = 7000;

export class ErroProvedor extends Error {}

export interface PerguntaAoProvedor {
  instrucao: string;
  texto: string;
  /** Esquema JSON da resposta (subconjunto OpenAPI, como o Gemini aceita). */
  esquema: Record<string, unknown>;
}

/** Faz a pergunta e devolve o JSON da resposta (ainda não confiável). */
export async function perguntar(
  { instrucao, texto, esquema }: PerguntaAoProvedor,
  env: { get(nome: string): string | undefined }
): Promise<unknown> {
  const chave = env.get('GEMINI_API_KEY');
  if (!chave) throw new ErroProvedor('GEMINI_API_KEY não configurada');
  const modelo = env.get('GEMINI_MODELO') || MODELO_PADRAO;

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucao }] },
        contents: [{ role: 'user', parts: [{ text: texto }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: esquema,
          temperature: 0,
          maxOutputTokens: 500,
        },
      }),
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    }
  );
  if (!resposta.ok) throw new ErroProvedor(`provedor respondeu ${resposta.status}`);

  const corpo = await resposta.json();
  const json = corpo?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof json !== 'string') throw new ErroProvedor('resposta sem texto');
  try {
    return JSON.parse(json);
  } catch {
    throw new ErroProvedor('resposta não é JSON');
  }
}

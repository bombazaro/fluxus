// Função "ia": ajuda a cadastrar gastos (sugere categoria e interpreta texto livre).
// Só quem está logado chama (o Supabase confere o JWT antes de entrar aqui).
// Limite diário por pessoa; o texto digitado não é guardado, só o contador de usos.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { lerPedido, limparResposta, montarEsquema, montarInstrucao } from './logica.ts';
import { perguntar } from './provedor.ts';

const LIMITE_PADRAO = 50;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return responder(405, { erro: 'método' });

  const lido = lerPedido(await req.json().catch(() => null));
  if ('erro' in lido) return responder(400, { erro: lido.erro });
  const { pedido } = lido;

  // Conta o uso com o login da própria pessoa (a função SQL filtra por auth.uid())
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const limite = Number(Deno.env.get('IA_LIMITE_DIARIO')) || LIMITE_PADRAO;
  const { data: liberado, error } = await supabase.rpc('registrar_uso_ia', { limite });
  if (error) return responder(401, { erro: 'login' });
  if (liberado !== true) return responder(429, { erro: 'limite' });

  try {
    const bruta = await perguntar(
      { instrucao: montarInstrucao(pedido), texto: pedido.texto, esquema: montarEsquema(pedido) },
      Deno.env
    );
    return responder(200, { resultado: limparResposta(bruta, pedido) });
  } catch (e) {
    console.error('ia:', e instanceof Error ? e.message : 'erro');
    return responder(502, { erro: 'indisponivel' });
  }
});

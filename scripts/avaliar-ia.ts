/**
 * Mede a IA de verdade: roda as frases de __tests__/ia/casos.json pela mesma cadeia do app
 * (instrução → provedor → limpeza do servidor → validação do app) e conta os acertos por campo.
 *
 * Uso:   GEMINI_API_KEY=... npx tsx scripts/avaliar-ia.ts
 *        (ou guarde a chave em .env.ia, que o git ignora: GEMINI_API_KEY=...)
 * Custo: zero no plano gratuito (dentro do limite diário). Faz uma chamada por frase.
 */
import { readFileSync, existsSync } from 'node:fs';
import {
  lerPedido,
  limparResposta,
  montarEsquema,
  montarInstrucao,
} from '../supabase/functions/ia/logica';
import { perguntar } from '../supabase/functions/ia/provedor';
import { validarResposta } from '../src/domain/ia/validar';
import { categoriaPorNome } from '../src/domain/ia/categorias';
import { Categoria } from '../src/types';

if (existsSync('.env.ia')) {
  for (const linha of readFileSync('.env.ia', 'utf8').split('\n')) {
    const [k, ...v] = linha.split('=');
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
  }
}
const env = { get: (n: string) => process.env[n] };
const casos = JSON.parse(readFileSync('__tests__/ia/casos.json', 'utf8'));
const categorias = casos.categorias.map((nome: string, i: number) => ({
  id: i + 1,
  nome,
  cor: '',
  icone: '',
})) as Categoria[];
const nomeDe = (id: number | null) => categorias.find((c) => c.id === id)?.nome ?? null;
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chamar(tarefa: 'categoria' | 'cadastro', texto: string) {
  const l = lerPedido({ tarefa, texto, categorias: casos.categorias, hoje: casos.hoje });
  if ('erro' in l) throw new Error(l.erro);
  const bruta = await perguntar(
    {
      instrucao: montarInstrucao(l.pedido),
      texto: l.pedido.texto,
      esquema: montarEsquema(l.pedido),
    },
    env
  );
  return limparResposta(bruta, l.pedido);
}

async function main() {
  if (!process.env.GEMINI_API_KEY)
    throw new Error('Defina GEMINI_API_KEY (veja o topo deste arquivo).');
  const campos = { tipo: [0, 0], valor: [0, 0], categoria: [0, 0], data: [0, 0] } as Record<
    string,
    number[]
  >;
  let perfeitas = 0;
  const erros: string[] = [];

  for (const caso of casos.cadastro) {
    const esp = caso.esperado;
    let r;
    try {
      r = validarResposta(await chamar('cadastro', caso.texto), {
        texto: caso.texto,
        hoje: casos.hoje,
        categorias,
      });
    } catch (e) {
      erros.push(`${caso.texto}: ERRO ${(e as Error).message}`);
      await pausa(1500);
      continue;
    }
    const c = r.entendeu ? r.cadastro : null;
    const marcar = (campo: string, ok: boolean) => {
      campos[campo][1]++;
      if (ok) campos[campo][0]++;
      return ok;
    };
    const oks: boolean[] = [];
    if (esp.entendeu === false) oks.push(r.entendeu === false);
    if ('valor' in esp) oks.push(marcar('valor', (c?.valorCentavos ?? null) === esp.valor));
    if (esp.tipo) oks.push(marcar('tipo', [esp.tipo].flat().includes(c?.tipo)));
    if (esp.categoria)
      oks.push(marcar('categoria', nomeDe(c?.categoriaId ?? null) === esp.categoria));
    if (esp.data) oks.push(marcar('data', c?.dataIso === esp.data));
    if (esp.dia) oks.push(c?.diaVencimento === esp.dia);
    if (esp.parcelas) oks.push(c?.parcelas === esp.parcelas);
    const ok = oks.every(Boolean);
    if (ok) perfeitas++;
    else erros.push(`${caso.texto} → ${JSON.stringify(c ?? r)}`);
    await pausa(1500); // respeita o limite por minuto do plano gratuito
  }

  let catOk = 0;
  for (const caso of casos.categoria) {
    try {
      const r = await chamar('categoria', caso.texto);
      const id = categoriaPorNome(r.categoria, categorias);
      if (nomeDe(id) === caso.esperado) catOk++;
      else erros.push(`categoria "${caso.texto}" → ${nomeDe(id)} (esperado ${caso.esperado})`);
    } catch (e) {
      erros.push(`categoria "${caso.texto}": ERRO ${(e as Error).message}`);
    }
    await pausa(1500);
  }

  const pct = (a: number, b: number) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : '-');
  console.log(
    `\nModelo: ${process.env.GEMINI_MODELO || '(padrão de provedor.ts)'}  ·  hoje fixo: ${casos.hoje}`
  );
  console.log(`Frases 100% corretas: ${pct(perfeitas, casos.cadastro.length)}  (meta ≥ 75%)`);
  for (const [k, [a, b]] of Object.entries(campos))
    console.log(`  ${k.padEnd(10)} ${pct(a, b)}  (meta ≥ 85%)`);
  console.log(`Categoria só pelo nome: ${pct(catOk, casos.categoria.length)}`);
  if (erros.length) console.log('\nErros:\n- ' + erros.join('\n- '));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

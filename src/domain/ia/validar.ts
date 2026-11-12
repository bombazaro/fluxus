import { Categoria } from '../../types';
import { categoriaPorNome } from './categorias';
import {
  CadastroInterpretado,
  ResultadoInterpretacao,
  TIPOS_CADASTRO,
  TipoCadastro,
  VALOR_MAXIMO_CENTAVOS,
} from './tipos';

export interface ContextoValidacao {
  /** Texto que a pessoa digitou. */
  texto: string;
  /** Dia de hoje (AAAA-MM-DD), o mesmo enviado à IA. */
  hoje: string;
  categorias: Categoria[];
}

const NAO_ENTENDI = 'Não entendi. Tente descrever de outro jeito.';
const DESCRICAO_MAXIMA = 60;
const DIAS_MAXIMOS_DE_DISTANCIA = 366;

function ehObjeto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function ehInteiro(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x);
}

/** Dia real do calendário no formato AAAA-MM-DD? */
function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function diasEntre(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/** Valores (em centavos) que aparecem no texto: "1.250,50", "23,50", "150", "12x". */
function valoresDoTexto(texto: string): number[] {
  const achados = texto.match(/\d[\d.,]*/g) ?? [];
  const centavos: number[] = [];
  for (const bruto of achados) {
    const t = bruto.replace(/[.,]+$/, '');
    let numero: number;
    if (t.includes(',')) numero = Number(t.replace(/\./g, '').replace(',', '.'));
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) numero = Number(t.replace(/\./g, ''));
    else numero = Number(t);
    if (Number.isFinite(numero)) centavos.push(Math.round(numero * 100));
  }
  return centavos;
}

/**
 * Confere a resposta da IA antes de usar. Nada vem confiável: o servidor já filtra, mas o
 * app confere de novo. O que não passa vira campo vazio e um aviso, nunca um chute.
 */
export function validarResposta(bruta: unknown, ctx: ContextoValidacao): ResultadoInterpretacao {
  if (!ehObjeto(bruta)) return { entendeu: false, motivo: NAO_ENTENDI };
  if (bruta.entendeu !== true) {
    const motivo =
      typeof bruta.motivo === 'string' && bruta.motivo.trim() ? bruta.motivo : NAO_ENTENDI;
    return { entendeu: false, motivo: motivo.slice(0, 120) };
  }
  if (!TIPOS_CADASTRO.includes(bruta.tipo as TipoCadastro)) {
    return { entendeu: false, motivo: NAO_ENTENDI };
  }
  const tipo = bruta.tipo as TipoCadastro;
  const avisos: string[] = [];

  // valor
  let valorCentavos: number | null = null;
  if (bruta.valor_centavos == null) {
    avisos.push('Não achei o valor. Preencha.');
  } else if (
    ehInteiro(bruta.valor_centavos) &&
    bruta.valor_centavos > 0 &&
    bruta.valor_centavos <= VALOR_MAXIMO_CENTAVOS
  ) {
    valorCentavos = bruta.valor_centavos;
    const doTexto = valoresDoTexto(ctx.texto);
    if (doTexto.length > 0 && !doTexto.includes(valorCentavos)) {
      avisos.push('Confira o valor: ele não aparece igual no texto.');
    }
  } else {
    avisos.push('O valor não parece certo. Preencha.');
  }

  // data
  let dataIso: string | null = null;
  if (bruta.data == null) {
    dataIso = tipo === 'pago' ? ctx.hoje : null;
  } else if (
    typeof bruta.data === 'string' &&
    dataValida(bruta.data) &&
    diasEntre(bruta.data, ctx.hoje) <= DIAS_MAXIMOS_DE_DISTANCIA
  ) {
    dataIso = bruta.data;
  } else {
    dataIso = ctx.hoje;
    avisos.push('Confira a data: usei a de hoje.');
  }

  if (tipo === 'unica' && dataIso === null)
    avisos.push('Não achei a data de vencimento. Preencha.');

  // dia de vencimento e parcelas
  const dia = bruta.dia_vencimento;
  const diaVencimento = ehInteiro(dia) && dia >= 1 && dia <= 31 ? dia : null;
  let parcelas: number | null = null;
  if (tipo === 'parcelada') {
    const p = bruta.parcelas;
    if (ehInteiro(p) && p >= 2 && p <= 120) parcelas = p;
    else avisos.push('Confira o número de parcelas.');
  }

  const descricao =
    typeof bruta.descricao === 'string' ? bruta.descricao.trim().slice(0, DESCRICAO_MAXIMA) : '';

  const cadastro: CadastroInterpretado = {
    tipo,
    descricao,
    valorCentavos,
    categoriaId: categoriaPorNome(bruta.categoria, ctx.categorias),
    dataIso,
    diaVencimento,
    parcelas,
    avisos,
  };
  return { entendeu: true, cadastro };
}

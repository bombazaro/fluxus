const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Converte valor em centavos para string formatada em Real (ex: 1050 -> "R$ 10,50")
 */
export function formatarMoeda(centavos: number): string {
  const reais = (centavos || 0) / 100;
  return formatadorBRL.format(reais);
}

/**
 * Converte centavos para número decimal em reais
 */
export function centavosParaReais(centavos: number): number {
  return (centavos || 0) / 100;
}

/**
 * Converte valor decimal em reais para centavos inteiros
 */
export function reaisParaCentavos(reais: number): number {
  return Math.round((reais || 0) * 100);
}

/**
 * Converte texto digitado pelo usuário (apenas dígitos) em centavos inteiros
 * Ex: "1" -> 1 centavo (R$ 0,01), "1234" -> 1234 centavos (R$ 12,34)
 */
export function parseMoedaParaCentavos(texto: string): number {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return 0;
  return parseInt(digitos, 10);
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

/**
 * Formata data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA)
 */
export function formatarData(dataIso: string): string {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  const [ano, mes, dia] = partes;
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
}

/**
 * Formata data ISO (YYYY-MM-DD) para formato curto (DD/MM)
 */
export function formatarDataCurta(dataIso: string): string {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length < 3) return dataIso;
  const [, mes, dia] = partes;
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}`;
}

/**
 * Formata mês de referência (YYYY-MM) para extenso: "Maio 2026"
 */
export function formatarMesAno(mesRef: string): string {
  if (!mesRef) return '';
  const [anoStr, mesStr] = mesRef.split('-');
  const mesIndex = parseInt(mesStr, 10) - 1;
  const mesNome = MESES[mesIndex] || mesStr;
  return `${mesNome} ${anoStr}`;
}

/**
 * Formata mês de referência (YYYY-MM) abreviado: "Mai/26"
 */
export function formatarMesAnoAbrev(mesRef: string): string {
  if (!mesRef) return '';
  const [anoStr, mesStr] = mesRef.split('-');
  const mesIndex = parseInt(mesStr, 10) - 1;
  const mesNome = MESES_ABREV[mesIndex] || mesStr;
  return `${mesNome}/${anoStr.slice(2)}`;
}

/**
 * Confere se o texto é uma data real no formato AAAA-MM-DD (ex: recusa 2026-02-30).
 */
export function ehDataIsoValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

/**
 * Valor curto para rótulos de gráfico: "R$ 450", "R$ 2,9 mil", "−R$ 1,2 mil".
 */
export function formatarMoedaCurta(centavos: number): string {
  const reais = Math.round(Math.abs(centavos) / 100);
  const sinal = centavos < 0 ? '−' : '';
  if (reais < 1000) return `${sinal}R$ ${reais}`;
  const mil = (reais / 1000).toFixed(reais < 10000 ? 1 : 0).replace('.', ',').replace(/,0$/, '');
  return `${sinal}R$ ${mil} mil`;
}

/**
 * Máscara de data enquanto a pessoa digita: só números, com as barras no lugar.
 * Ex: "2210" -> "22/10", "22102026" -> "22/10/2026".
 */
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/**
 * Converte a data digitada (DD/MM/AAAA) para o formato do banco (AAAA-MM-DD).
 * Devolve null se a data não existir (ex: 30/02/2026) ou estiver incompleta.
 */
export function dataBrParaIso(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const iso = `${partes[3]}-${partes[2]}-${partes[1]}`;
  return ehDataIsoValida(iso) ? iso : null;
}

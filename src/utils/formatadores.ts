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

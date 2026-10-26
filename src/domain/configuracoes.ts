export type TemaPreferido = 'sistema' | 'claro' | 'escuro';

/** Preferências do app. Ficam na tabela configuracoes como chave/valor em texto. */
export interface Configuracoes {
  tema: TemaPreferido;
  /** Como a pessoa quer ser chamada na saudação ('' = sem nome). */
  nome: string;
  notificacoesAtivas: boolean;
  /** Hora do lembrete (0 a 23). */
  notificacaoHora: number;
  /** Quantos dias antes do vencimento avisar (0 = só no dia). */
  notificacaoDiasAntes: number;
  /** % da renda a partir do qual o aviso fica amarelo. */
  limiteAtencaoPercentual: number;
  /** Quantos meses pagos entram na média das contas variáveis. */
  mesesMedia: number;
  /** Em contas compartilhadas, contar só a parte do usuário no resumo. */
  contarSoMinhaParte: boolean;
  /** Começar o saldo do mês com o que sobrou do mês anterior. */
  usarSobraDoMesAnterior: boolean;
  onboardingConcluido: boolean;
}

export const CONFIG_PADRAO: Configuracoes = {
  tema: 'sistema',
  nome: '',
  notificacoesAtivas: false,
  notificacaoHora: 9,
  notificacaoDiasAntes: 1,
  limiteAtencaoPercentual: 80,
  mesesMedia: 3,
  contarSoMinhaParte: true,
  usarSobraDoMesAnterior: true,
  onboardingConcluido: false,
};

/** Tamanho máximo do nome na saudação. */
export const NOME_MAXIMO = 30;

export const OPCOES_DIAS_ANTES = [0, 1, 2, 3];
export const OPCOES_MESES_MEDIA = [3, 6];
export const OPCOES_LIMITE_ATENCAO = [70, 80, 90];

function lerBooleano(valor: string | undefined, padrao: boolean): boolean {
  if (valor === '1') return true;
  if (valor === '0') return false;
  return padrao;
}

function lerInteiro(valor: string | undefined, padrao: number, min: number, max: number): number {
  if (valor === undefined) return padrao;
  const n = Number(valor);
  return Number.isInteger(n) && n >= min && n <= max ? n : padrao;
}

/**
 * Monta as configurações a partir das linhas do banco. Chave que falta ou valor
 * inválido (ex.: backup editado à mão) usa o padrão, então nunca quebra o app.
 */
export function lerConfiguracoes(linhas: { chave: string; valor: string }[]): Configuracoes {
  const mapa = new Map(linhas.map((l) => [l.chave, l.valor]));
  const tema = mapa.get('tema');

  return {
    tema: tema === 'claro' || tema === 'escuro' || tema === 'sistema' ? tema : CONFIG_PADRAO.tema,
    nome: (mapa.get('nome') ?? CONFIG_PADRAO.nome).trim().slice(0, NOME_MAXIMO),
    notificacoesAtivas: lerBooleano(
      mapa.get('notificacoesAtivas'),
      CONFIG_PADRAO.notificacoesAtivas
    ),
    notificacaoHora: lerInteiro(mapa.get('notificacaoHora'), CONFIG_PADRAO.notificacaoHora, 0, 23),
    notificacaoDiasAntes: lerInteiro(
      mapa.get('notificacaoDiasAntes'),
      CONFIG_PADRAO.notificacaoDiasAntes,
      0,
      7
    ),
    limiteAtencaoPercentual: lerInteiro(
      mapa.get('limiteAtencaoPercentual'),
      CONFIG_PADRAO.limiteAtencaoPercentual,
      1,
      100
    ),
    mesesMedia: lerInteiro(mapa.get('mesesMedia'), CONFIG_PADRAO.mesesMedia, 1, 12),
    contarSoMinhaParte: lerBooleano(
      mapa.get('contarSoMinhaParte'),
      CONFIG_PADRAO.contarSoMinhaParte
    ),
    usarSobraDoMesAnterior: lerBooleano(
      mapa.get('usarSobraDoMesAnterior'),
      CONFIG_PADRAO.usarSobraDoMesAnterior
    ),
    onboardingConcluido: lerBooleano(
      mapa.get('onboardingConcluido'),
      CONFIG_PADRAO.onboardingConcluido
    ),
  };
}

/** Converte as configurações alteradas em linhas chave/valor para salvar. */
export function serializarConfiguracoes(
  parcial: Partial<Configuracoes>
): { chave: string; valor: string }[] {
  return Object.entries(parcial).map(([chave, valor]) => ({
    chave,
    valor: typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor),
  }));
}

/**
 * Sugere começar o mês com a sobra do anterior quando o salário cai na segunda
 * metade do mês: aí ele costuma pagar as contas do começo do mês seguinte.
 */
export function sugerirUsarSobra(diaRecebimento: number): boolean {
  return diaRecebimento > 15;
}

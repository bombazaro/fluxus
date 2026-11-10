/** O que a IA pode devolver. Tudo é desconfiado até passar por `validarResposta`. */
export type TipoCadastro = 'pago' | 'fixa' | 'unica' | 'parcelada';

export const TIPOS_CADASTRO: readonly TipoCadastro[] = ['pago', 'fixa', 'unica', 'parcelada'];

/** Tamanho máximo do texto enviado à IA. */
export const TEXTO_MAXIMO = 200;

/** Maior valor aceito (R$ 1.000.000,00, em centavos). */
export const VALOR_MAXIMO_CENTAVOS = 100_000_000;

/** Cadastro já conferido, pronto para preencher um formulário. */
export interface CadastroInterpretado {
  tipo: TipoCadastro;
  descricao: string;
  /** Null quando a IA não achou o valor ou ele não passou na conferência. */
  valorCentavos: number | null;
  /** Id de uma categoria que existe; null se não houve correspondência. */
  categoriaId: number | null;
  /** AAAA-MM-DD (dia do gasto ou do vencimento); null se não deu para saber. */
  dataIso: string | null;
  /** Dia do mês (1 a 31) das contas fixas; null se não deu para saber. */
  diaVencimento: number | null;
  /** Total de parcelas (2 a 120) das contas parceladas. */
  parcelas: number | null;
  /** Campos que a pessoa deve conferir, em frases curtas. */
  avisos: string[];
}

export type ResultadoInterpretacao =
  { entendeu: true; cadastro: CadastroInterpretado } | { entendeu: false; motivo: string };

/** Sugestão de categoria para um nome digitado. */
export interface SugestaoCategoria {
  categoriaId: number;
}

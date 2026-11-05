export type TamanhoDaTela = 'compacto' | 'medio' | 'largo';

/** Larguras (em px) a partir das quais a janela passa a ser média e larga. */
export const A_PARTIR_DE_MEDIO = 600;
export const A_PARTIR_DE_LARGO = 1024;

/** Largura máxima do app em cada tamanho; null = ocupa a janela toda. */
export const LARGURA_MAXIMA: Record<TamanhoDaTela, number | null> = {
  compacto: 480,
  medio: 720,
  largo: null,
};

/** Largura do menu lateral, que só existe em `largo`. */
export const LARGURA_MENU_LATERAL = 200;

/** celular < 600, tablet 600–1023, desktop ≥ 1024. Valor inválido conta como celular. */
export function tamanhoDaTela(largura: number): TamanhoDaTela {
  if (!(largura >= A_PARTIR_DE_MEDIO)) return 'compacto';
  return largura >= A_PARTIR_DE_LARGO ? 'largo' : 'medio';
}

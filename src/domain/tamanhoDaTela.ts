export type TamanhoDaTela = 'compacto' | 'medio' | 'largo';

/** Larguras (em px) a partir das quais a janela passa a ser média e larga. */
export const A_PARTIR_DE_MEDIO = 600;
export const A_PARTIR_DE_LARGO = 1024;

/** Largura máxima do conteúdo em cada tamanho. */
export const LARGURA_MAXIMA: Record<TamanhoDaTela, number> = {
  compacto: 480,
  medio: 720,
  largo: 1100,
};

/** Largura do menu lateral, que só existe em `largo` e fica fora da largura do conteúdo. */
export const LARGURA_MENU_LATERAL = 200;

/** celular < 600, tablet 600–1023, desktop ≥ 1024. Valor inválido conta como celular. */
export function tamanhoDaTela(largura: number): TamanhoDaTela {
  if (!(largura >= A_PARTIR_DE_MEDIO)) return 'compacto';
  return largura >= A_PARTIR_DE_LARGO ? 'largo' : 'medio';
}

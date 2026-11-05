import { TemaPreferido } from '@/src/domain/configuracoes';

export type EsquemaDeCores = 'light' | 'dark';

/** Qual conjunto de cores usar: a escolha da pessoa, ou o do sistema quando ela deixou em "sistema". */
export function esquemaDeCores(
  preferido: TemaPreferido,
  sistema: string | null | undefined
): EsquemaDeCores {
  if (preferido === 'claro') return 'light';
  if (preferido === 'escuro') return 'dark';
  return sistema === 'dark' ? 'dark' : 'light';
}

import { Categoria } from '../../types';

/** Minúsculas, sem acento e sem espaços sobrando: "Alimentação " e "alimentacao" ficam iguais. */
export function normalizarNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Id da categoria que a IA citou pelo nome; null se não existir nenhuma com esse nome. */
export function categoriaPorNome(nome: unknown, categorias: Categoria[]): number | null {
  if (typeof nome !== 'string' || !nome.trim()) return null;
  const alvo = normalizarNome(nome);
  return categorias.find((c) => normalizarNome(c.nome) === alvo)?.id ?? null;
}

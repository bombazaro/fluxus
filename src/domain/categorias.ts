import { Categoria } from '../types';
import { CATEGORIAS_PADRAO } from '../db/schema';

/** Nome da categoria que abre a opção de criar uma nova. */
export const NOME_OUTROS = 'Outros';

export const NOME_CATEGORIA_MAXIMO = 24;

/** Cores das categorias criadas pela pessoa (diferentes das padrão). */
export const CORES_NOVAS_CATEGORIAS = [
  '#0891B2',
  '#CA8A04',
  '#DB2777',
  '#65A30D',
  '#7C3AED',
  '#C2410C',
  '#059669',
  '#475569',
];

export interface ResultadoNovaCategoria {
  /** Categoria a criar; null se deu erro ou se já existe uma com esse nome. */
  categoria: Omit<Categoria, 'id'> | null;
  /** Categoria que já existe com o mesmo nome (sem diferenciar maiúsculas). */
  existenteId: number | null;
  erro: string | null;
}

/**
 * Valida o nome digitado e monta a categoria nova. Se já existe uma com o
 * mesmo nome, devolve o id dela para ser escolhida em vez de duplicar.
 */
export function novaCategoria(nome: string, existentes: Categoria[]): ResultadoNovaCategoria {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (!limpo) return { categoria: null, existenteId: null, erro: 'Digite o nome da categoria' };
  if (limpo.length > NOME_CATEGORIA_MAXIMO) {
    return {
      categoria: null,
      existenteId: null,
      erro: `Use até ${NOME_CATEGORIA_MAXIMO} letras`,
    };
  }

  const igual = existentes.find(
    (c) => c.nome.toLocaleLowerCase('pt-BR') === limpo.toLocaleLowerCase('pt-BR')
  );
  if (igual) return { categoria: null, existenteId: igual.id, erro: null };

  const nomeFinal = limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1);
  return {
    categoria: {
      nome: nomeFinal,
      cor: CORES_NOVAS_CATEGORIAS[existentes.length % CORES_NOVAS_CATEGORIAS.length],
      icone: 'pricetag',
    },
    existenteId: null,
    erro: null,
  };
}

/** As categorias que vêm com o app não podem ser renomeadas nem excluídas. */
export function ehCategoriaPadrao(categoria: Pick<Categoria, 'nome'>): boolean {
  return CATEGORIAS_PADRAO.some((p) => p.nome === categoria.nome);
}

/** Valida o novo nome de uma categoria criada pela pessoa (sem repetir o de outra). */
export function validarRenomear(
  id: number,
  nome: string,
  existentes: Categoria[]
): { nome: string | null; erro: string | null } {
  const { categoria, existenteId, erro } = novaCategoria(
    nome,
    existentes.filter((c) => c.id !== id)
  );
  if (erro) return { nome: null, erro };
  if (existenteId !== null) return { nome: null, erro: 'Já existe uma categoria com esse nome' };
  return { nome: categoria!.nome, erro: null };
}

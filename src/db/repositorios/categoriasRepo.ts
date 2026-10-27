import { SQLiteDatabase } from 'expo-sqlite';
import { Categoria } from '@/src/types';
import { NOME_OUTROS, novaCategoria } from '@/src/domain/categorias';

export const categoriasRepo = {
  async listarTodas(db: SQLiteDatabase): Promise<Categoria[]> {
    return await db.getAllAsync<Categoria>(
      "SELECT * FROM categorias ORDER BY nome = 'Outros', nome COLLATE NOCASE ASC;"
    );
  },

  async buscarPorId(db: SQLiteDatabase, id: number): Promise<Categoria | null> {
    const row = await db.getFirstAsync<Categoria>('SELECT * FROM categorias WHERE id = ?;', [id]);
    return row || null;
  },

  async criar(db: SQLiteDatabase, cat: Omit<Categoria, 'id'>): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO categorias (nome, cor, icone) VALUES (?, ?, ?);',
      [cat.nome, cat.cor, cat.icone]
    );
    return result.lastInsertRowId;
  },

  /** Cria a categoria digitada pela pessoa; se já existe uma com esse nome, devolve ela. */
  async criarPeloNome(
    db: SQLiteDatabase,
    nome: string
  ): Promise<{ id: number | null; erro: string | null }> {
    const { categoria, existenteId, erro } = novaCategoria(
      nome,
      await categoriasRepo.listarTodas(db)
    );
    if (erro) return { id: null, erro };
    if (existenteId !== null) return { id: existenteId, erro: null };
    return { id: await categoriasRepo.criar(db, categoria!), erro: null };
  },

  /**
   * Categoria a gravar na conta. Com "Outros" escolhida e um nome digitado no
   * campo de categoria nova, cria (ou reaproveita) essa categoria, mesmo que a
   * pessoa não tenha tocado em "Criar categoria".
   */
  async resolverEscolha(
    db: SQLiteDatabase,
    categoriaId: number | null,
    nomePendente: string
  ): Promise<{ id: number | null; erro: string | null }> {
    if (categoriaId === null || !nomePendente.trim()) return { id: categoriaId, erro: null };
    const escolhida = await categoriasRepo.buscarPorId(db, categoriaId);
    if (escolhida?.nome !== NOME_OUTROS) return { id: categoriaId, erro: null };
    return categoriasRepo.criarPeloNome(db, nomePendente);
  },
};

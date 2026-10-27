import { SQLiteDatabase } from 'expo-sqlite';
import { Categoria } from '@/src/types';
import {
  ehCategoriaPadrao,
  NOME_OUTROS,
  novaCategoria,
  validarRenomear,
} from '@/src/domain/categorias';

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

  /** Quantas contas usam a categoria (para avisar antes de excluir). */
  async contarContas(db: SQLiteDatabase, id: number): Promise<number> {
    const row = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM contas WHERE categoria_id = ?;',
      [id]
    );
    return row?.total ?? 0;
  },

  /** Renomeia uma categoria criada pela pessoa. As que vêm com o app ficam como estão. */
  async renomear(db: SQLiteDatabase, id: number, nome: string): Promise<string | null> {
    const todas = await categoriasRepo.listarTodas(db);
    const atual = todas.find((c) => c.id === id);
    if (!atual || ehCategoriaPadrao(atual)) return 'Essa categoria não pode ser renomeada';
    const resultado = validarRenomear(id, nome, todas);
    if (resultado.erro) return resultado.erro;
    await db.runAsync('UPDATE categorias SET nome = ? WHERE id = ?;', [resultado.nome, id]);
    return null;
  },

  /**
   * Exclui uma categoria criada pela pessoa. As contas dela passam para a
   * categoria de destino, então nenhuma conta fica sem categoria.
   */
  async excluir(db: SQLiteDatabase, id: number, destinoId: number): Promise<string | null> {
    const todas = await categoriasRepo.listarTodas(db);
    const atual = todas.find((c) => c.id === id);
    if (!atual || ehCategoriaPadrao(atual)) return 'Essa categoria não pode ser excluída';
    if (destinoId === id || !todas.some((c) => c.id === destinoId)) {
      return 'Escolha para qual categoria as contas vão';
    }
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE contas SET categoria_id = ? WHERE categoria_id = ?;', [
        destinoId,
        id,
      ]);
      await db.runAsync('DELETE FROM categorias WHERE id = ?;', [id]);
    });
    return null;
  },
};

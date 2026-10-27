import { CORES_NOVAS_CATEGORIAS, ehCategoriaPadrao, novaCategoria } from '../src/domain/categorias';
import { categoriasRepo } from '../src/db/repositorios/categoriasRepo';
import { Categoria } from '../src/types';
import { criarBanco } from './helpers/bancoEmMemoria';

const EXISTENTES: Categoria[] = [
  { id: 1, nome: 'Moradia', cor: '#0F766E', icone: 'home' },
  { id: 8, nome: 'Outros', cor: '#64748B', icone: 'ellipsis-horizontal' },
];

describe('novaCategoria', () => {
  it('monta a categoria com a primeira letra maiúscula, cor e ícone', () => {
    expect(novaCategoria('  pets  ', EXISTENTES)).toEqual({
      categoria: { nome: 'Pets', cor: CORES_NOVAS_CATEGORIAS[2], icone: 'pricetag' },
      existenteId: null,
      erro: null,
    });
  });

  it('junta espaços repetidos', () => {
    expect(novaCategoria('Cuidados   pessoais', EXISTENTES).categoria?.nome).toBe(
      'Cuidados pessoais'
    );
  });

  it('nome que já existe escolhe a categoria existente em vez de duplicar', () => {
    expect(novaCategoria('MORADIA', EXISTENTES)).toEqual({
      categoria: null,
      existenteId: 1,
      erro: null,
    });
  });

  it('recusa nome vazio ou longo demais', () => {
    expect(novaCategoria('   ', EXISTENTES).erro).toBe('Digite o nome da categoria');
    expect(novaCategoria('a'.repeat(25), EXISTENTES).erro).toBe('Use até 24 letras');
  });
});

describe('categoriasRepo', () => {
  it('lista em ordem alfabética, com Outros por último', async () => {
    const db = await criarBanco();
    await categoriasRepo.criar(db, { nome: 'Pets', cor: '#000000', icone: 'pricetag' });
    const nomes = (await categoriasRepo.listarTodas(db)).map((c) => c.nome);
    expect(nomes[nomes.length - 1]).toBe('Outros');
    expect(nomes).toContain('Pets');
    expect(nomes.indexOf('Moradia')).toBeLessThan(nomes.indexOf('Pets'));
  });
});

describe('categoriasRepo.resolverEscolha', () => {
  it('com Outros e um nome digitado, cria a categoria e usa ela', async () => {
    const db = await criarBanco();
    const outros = (await categoriasRepo.listarTodas(db)).find((c) => c.nome === 'Outros')!;

    const { id, erro } = await categoriasRepo.resolverEscolha(db, outros.id, 'academia');
    expect(erro).toBeNull();
    expect((await categoriasRepo.buscarPorId(db, id!))?.nome).toBe('Academia');
  });

  it('sem nome digitado, ou com outra categoria escolhida, mantém a escolha', async () => {
    const db = await criarBanco();
    const [primeira] = await categoriasRepo.listarTodas(db);
    const outros = (await categoriasRepo.listarTodas(db)).find((c) => c.nome === 'Outros')!;

    expect(await categoriasRepo.resolverEscolha(db, outros.id, '  ')).toEqual({
      id: outros.id,
      erro: null,
    });
    expect(await categoriasRepo.resolverEscolha(db, primeira.id, 'Academia')).toEqual({
      id: primeira.id,
      erro: null,
    });
  });
});

describe('editar e excluir categorias', () => {
  async function bancoComPets() {
    const db = await criarBanco();
    const { id } = await categoriasRepo.criarPeloNome(db, 'Pets');
    const moradia = (await categoriasRepo.listarTodas(db)).find((c) => c.nome === 'Moradia')!;
    return { db, petsId: id!, moradiaId: moradia.id };
  }

  async function criarConta(db: Awaited<ReturnType<typeof criarBanco>>, categoriaId: number) {
    await db.runAsync(
      `INSERT INTO contas (nome, categoria_id, tipo, valor_centavos, data_inicio, ativa, criado_em)
       VALUES ('Ração', ?, 'fixa', 10000, '2026-10-01', 1, '2026-10-01');`,
      [categoriaId]
    );
  }

  it('só as categorias criadas pela pessoa podem ser mudadas', () => {
    expect(ehCategoriaPadrao({ nome: 'Moradia' })).toBe(true);
    expect(ehCategoriaPadrao({ nome: 'Outros' })).toBe(true);
    expect(ehCategoriaPadrao({ nome: 'Pets' })).toBe(false);
  });

  it('renomeia, sem repetir o nome de outra categoria', async () => {
    const { db, petsId, moradiaId } = await bancoComPets();
    expect(await categoriasRepo.renomear(db, petsId, 'bichos')).toBeNull();
    expect((await categoriasRepo.buscarPorId(db, petsId))?.nome).toBe('Bichos');
    expect(await categoriasRepo.renomear(db, petsId, 'moradia')).toBe(
      'Já existe uma categoria com esse nome'
    );
    expect(await categoriasRepo.renomear(db, moradiaId, 'Casa')).toBe(
      'Essa categoria não pode ser renomeada'
    );
  });

  it('exclui e passa as contas para a categoria escolhida', async () => {
    const { db, petsId, moradiaId } = await bancoComPets();
    await criarConta(db, petsId);
    expect(await categoriasRepo.contarContas(db, petsId)).toBe(1);

    expect(await categoriasRepo.excluir(db, petsId, moradiaId)).toBeNull();
    expect(await categoriasRepo.buscarPorId(db, petsId)).toBeNull();
    expect(await categoriasRepo.contarContas(db, moradiaId)).toBe(1);
  });

  it('não exclui as categorias do app nem manda as contas para ela mesma', async () => {
    const { db, petsId, moradiaId } = await bancoComPets();
    expect(await categoriasRepo.excluir(db, moradiaId, petsId)).toBe(
      'Essa categoria não pode ser excluída'
    );
    expect(await categoriasRepo.excluir(db, petsId, petsId)).toBe(
      'Escolha para qual categoria as contas vão'
    );
  });
});

import { CORES_NOVAS_CATEGORIAS, novaCategoria } from '../src/domain/categorias';
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

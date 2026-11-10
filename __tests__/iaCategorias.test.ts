import { categoriaPorNome, normalizarNome } from '../src/domain/ia/categorias';
import { Categoria } from '../src/types';

const cats = [
  { id: 1, nome: 'Alimentação', cor: '#000', icone: 'x' },
  { id: 2, nome: 'Pets', cor: '#000', icone: 'x' },
] as Categoria[];

describe('categoriaPorNome', () => {
  it('ignora maiúsculas, acento e espaços', () => {
    expect(categoriaPorNome('  alimentacao ', cats)).toBe(1);
    expect(categoriaPorNome('PETS', cats)).toBe(2);
  });
  it('devolve null para nome que não existe, vazio ou que não é texto', () => {
    expect(categoriaPorNome('Viagens', cats)).toBeNull();
    expect(categoriaPorNome('', cats)).toBeNull();
    expect(categoriaPorNome(42, cats)).toBeNull();
    expect(categoriaPorNome(null, cats)).toBeNull();
  });
  it('normalizarNome', () => {
    expect(normalizarNome('Ação  Rápida')).toBe('acao rapida');
  });
});

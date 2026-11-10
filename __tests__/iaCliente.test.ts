import {
  ClienteFuncoes,
  ErroIa,
  interpretarTexto,
  limparCacheDeSugestoes,
  sugerirCategoria,
} from '../src/services/ia/cliente';
import { Categoria } from '../src/types';

const categorias = [
  { id: 1, nome: 'Assinaturas', cor: '#000', icone: 'x' },
  { id: 2, nome: 'Moradia', cor: '#000', icone: 'x' },
] as Categoria[];
const HOJE = '2026-11-09';

function cliente(resposta: { data?: unknown; error?: unknown }) {
  const invoke = jest.fn().mockResolvedValue({ data: null, error: null, ...resposta });
  return { functions: { invoke } } as unknown as ClienteFuncoes & {
    functions: { invoke: jest.Mock };
  };
}
const erro = (name: string, status?: number) =>
  Object.assign(new Error(name), { name, context: status ? { status } : undefined });

beforeEach(() => limparCacheDeSugestoes());

describe('sugerirCategoria', () => {
  it('manda a tarefa, o nome e as categorias, e devolve o id da escolhida', async () => {
    const c = cliente({ data: { resultado: { categoria: 'Assinaturas' } } });
    expect(await sugerirCategoria(c, 'Netflix', categorias, HOJE)).toBe(1);
    expect(c.functions.invoke).toHaveBeenCalledWith(
      'ia',
      expect.objectContaining({
        body: {
          tarefa: 'categoria',
          texto: 'Netflix',
          categorias: ['Assinaturas', 'Moradia'],
          hoje: HOJE,
        },
      })
    );
  });

  it('sem correspondência devolve null', async () => {
    const c = cliente({ data: { resultado: { categoria: null } } });
    expect(await sugerirCategoria(c, 'Fulano', categorias, HOJE)).toBeNull();
  });

  it('categoria que não existe na lista é ignorada', async () => {
    const c = cliente({ data: { resultado: { categoria: 'Viagens' } } });
    expect(await sugerirCategoria(c, 'passagem', categorias, HOJE)).toBeNull();
  });

  it('repete o mesmo nome sem chamar de novo (ignora maiúsculas e acento)', async () => {
    const c = cliente({ data: { resultado: { categoria: 'Moradia' } } });
    await sugerirCategoria(c, 'Aluguel', categorias, HOJE);
    await sugerirCategoria(c, ' aluguel ', categorias, HOJE);
    expect(c.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('falha de qualquer tipo vira "sem sugestão" (null), sem estourar erro', async () => {
    const c = cliente({ error: erro('FunctionsFetchError') });
    expect(await sugerirCategoria(c, 'Netflix', categorias, HOJE)).toBeNull();
  });

  it('nome curto demais (menos de 3 letras) nem chama a IA', async () => {
    const c = cliente({ data: { resultado: { categoria: 'Moradia' } } });
    expect(await sugerirCategoria(c, 'ab', categorias, HOJE)).toBeNull();
    expect(c.functions.invoke).not.toHaveBeenCalled();
  });
});

describe('interpretarTexto', () => {
  const resposta = {
    entendeu: true,
    tipo: 'pago',
    descricao: 'Mercado',
    valor_centavos: 15000,
    categoria: 'Moradia',
    data: '2026-11-08',
  };

  it('confere a resposta e devolve o cadastro', async () => {
    const c = cliente({ data: { resultado: resposta } });
    const r = await interpretarTexto(c, 'paguei 150 de mercado ontem', categorias, HOJE);
    expect(r).toMatchObject({
      entendeu: true,
      cadastro: { valorCentavos: 15000, categoriaId: 2, dataIso: '2026-11-08' },
    });
  });

  it('texto vazio ou grande demais nem chama a IA', async () => {
    const c = cliente({ data: { resultado: resposta } });
    await expect(interpretarTexto(c, '   ', categorias, HOJE)).rejects.toMatchObject({
      codigo: 'texto',
    });
    await expect(interpretarTexto(c, 'a'.repeat(201), categorias, HOJE)).rejects.toMatchObject({
      codigo: 'texto',
    });
    expect(c.functions.invoke).not.toHaveBeenCalled();
  });

  it.each([
    [erro('FunctionsHttpError', 429), 'limite'],
    [erro('FunctionsHttpError', 401), 'login'],
    [erro('FunctionsHttpError', 502), 'indisponivel'],
    [erro('FunctionsRelayError'), 'indisponivel'],
    [erro('FunctionsFetchError'), 'sem_conexao'],
  ])('erro %# vira o código %s', async (e, codigo) => {
    const c = cliente({ error: e });
    const falha = interpretarTexto(c, 'netflix 55', categorias, HOJE);
    await expect(falha).rejects.toBeInstanceOf(ErroIa);
    await expect(falha).rejects.toMatchObject({ codigo });
  });

  it('resposta sem "resultado" vira indisponível', async () => {
    const c = cliente({ data: { oi: 1 } });
    await expect(interpretarTexto(c, 'netflix 55', categorias, HOJE)).rejects.toMatchObject({
      codigo: 'indisponivel',
    });
  });
});

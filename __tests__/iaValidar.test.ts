import { validarResposta } from '../src/domain/ia/validar';
import { Categoria } from '../src/types';

const categorias = [
  { id: 1, nome: 'Alimentação', cor: '#000', icone: 'x' },
  { id: 2, nome: 'Moradia', cor: '#000', icone: 'x' },
  { id: 3, nome: 'Outros', cor: '#000', icone: 'x' },
] as Categoria[];
const HOJE = '2026-11-09';
const ctx = (texto: string) => ({ texto, hoje: HOJE, categorias });

const resposta = (extra: Record<string, unknown> = {}) => ({
  entendeu: true,
  tipo: 'pago',
  descricao: 'Mercado',
  valor_centavos: 15000,
  categoria: 'Alimentação',
  data: '2026-11-08',
  ...extra,
});

function cadastro(r: ReturnType<typeof validarResposta>) {
  if (!r.entendeu) throw new Error('esperava cadastro: ' + r.motivo);
  return r.cadastro;
}

describe('validarResposta', () => {
  it('resposta correta vira cadastro sem avisos', () => {
    const c = cadastro(validarResposta(resposta(), ctx('paguei 150 de mercado ontem')));
    expect(c).toMatchObject({
      tipo: 'pago',
      descricao: 'Mercado',
      valorCentavos: 15000,
      categoriaId: 1,
      dataIso: '2026-11-08',
      avisos: [],
    });
  });

  it('não entendeu devolve o motivo', () => {
    const r = validarResposta({ entendeu: false, motivo: 'Não achei o valor.' }, ctx('oi'));
    expect(r).toEqual({ entendeu: false, motivo: 'Não achei o valor.' });
  });

  it.each([null, undefined, 'texto', 42, [], {}])(
    'lixo (%p) não quebra e vira "não entendi"',
    (lixo) => {
      expect(validarResposta(lixo, ctx('x')).entendeu).toBe(false);
    }
  );

  it('tipo fora da lista não é aceito', () => {
    expect(validarResposta(resposta({ tipo: 'doacao' }), ctx('x 150')).entendeu).toBe(false);
  });

  it.each([0, -5, 100_000_001, 1.5, '150', NaN])(
    'valor inválido (%p) é descartado com aviso',
    (v) => {
      const c = cadastro(validarResposta(resposta({ valor_centavos: v }), ctx('mercado')));
      expect(c.valorCentavos).toBeNull();
      expect(c.avisos.join(' ')).toMatch(/valor/i);
    }
  );

  it('valor ausente (frase ambígua) fica em branco com aviso', () => {
    const c = cadastro(validarResposta(resposta({ valor_centavos: null }), ctx('pizza 45 e 50')));
    expect(c.valorCentavos).toBeNull();
    expect(c.avisos.join(' ')).toMatch(/valor/i);
  });

  it('valor que não aparece no texto pede conferência', () => {
    const c = cadastro(validarResposta(resposta({ valor_centavos: 99900 }), ctx('mercado 150')));
    expect(c.valorCentavos).toBe(99900);
    expect(c.avisos.join(' ')).toMatch(/confira o valor/i);
  });

  it.each([
    ['mercado 150', 15000],
    ['luz 1.250,50', 125050],
    ['uber 23,50', 2350],
    ['geladeira 12x de 250', 25000],
    ['aluguel 1.200 todo dia 5', 120000],
  ])('valor do texto "%s" confere sem aviso', (texto, centavos) => {
    const c = cadastro(validarResposta(resposta({ valor_centavos: centavos }), ctx(texto)));
    expect(c.avisos).toEqual([]);
  });

  it('texto sem dígitos ("mil") não gera aviso de conferência', () => {
    const c = cadastro(
      validarResposta(resposta({ valor_centavos: 100000 }), ctx('gastei mil no mercado'))
    );
    expect(c.avisos).toEqual([]);
  });

  it('categoria inexistente fica vazia', () => {
    const c = cadastro(validarResposta(resposta({ categoria: 'Viagens' }), ctx('mercado 150')));
    expect(c.categoriaId).toBeNull();
  });

  it.each(['31/10/2026', '2026-13-40', '2026-02-30', 'ontem', 5, ''])(
    'data inválida (%p) usa hoje com aviso',
    (d) => {
      const c = cadastro(validarResposta(resposta({ data: d }), ctx('mercado 150')));
      expect(c.dataIso).toBe(HOJE);
      expect(c.avisos.join(' ')).toMatch(/data/i);
    }
  );

  it('data a mais de um ano de distância é recusada', () => {
    const c = cadastro(validarResposta(resposta({ data: '2028-01-01' }), ctx('mercado 150')));
    expect(c.dataIso).toBe(HOJE);
    expect(c.avisos.join(' ')).toMatch(/data/i);
  });

  it('data ausente não gera aviso para conta fixa (usa só o dia)', () => {
    const c = cadastro(
      validarResposta(
        resposta({ tipo: 'fixa', data: null, dia_vencimento: 12, valor_centavos: 5590 }),
        ctx('netflix 55,90 todo mês dia 12')
      )
    );
    expect(c.diaVencimento).toBe(12);
    expect(c.dataIso).toBeNull();
    expect(c.avisos).toEqual([]);
  });

  it.each([0, 32, 1.5, '5', null])('dia de vencimento inválido (%p) vira null', (d) => {
    const c = cadastro(
      validarResposta(
        resposta({ tipo: 'fixa', dia_vencimento: d, data: null, valor_centavos: 15000 }),
        ctx('x 150')
      )
    );
    expect(c.diaVencimento).toBeNull();
  });

  it('parcelada guarda o número de parcelas; fora de 2 a 120 vira null com aviso', () => {
    const ok = cadastro(
      validarResposta(
        resposta({ tipo: 'parcelada', parcelas: 12, valor_centavos: 25000, data: null }),
        ctx('geladeira 12x de 250')
      )
    );
    expect(ok.parcelas).toBe(12);
    const ruim = cadastro(
      validarResposta(
        resposta({ tipo: 'parcelada', parcelas: 500, valor_centavos: 25000, data: null }),
        ctx('geladeira 12x de 250')
      )
    );
    expect(ruim.parcelas).toBeNull();
    expect(ruim.avisos.join(' ')).toMatch(/parcelas/i);
  });

  it('descrição longa é cortada e vazia vira texto vazio', () => {
    const c = cadastro(
      validarResposta(resposta({ descricao: 'a'.repeat(200) }), ctx('mercado 150'))
    );
    expect(c.descricao.length).toBeLessThanOrEqual(60);
    const v = cadastro(validarResposta(resposta({ descricao: undefined }), ctx('mercado 150')));
    expect(v.descricao).toBe('');
  });
});

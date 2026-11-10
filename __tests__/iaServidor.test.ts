import {
  lerPedido,
  limparResposta,
  montarEsquema,
  montarInstrucao,
  Pedido,
} from '../supabase/functions/ia/logica';

const base = {
  tarefa: 'cadastro',
  texto: '  paguei 150 de   mercado ontem ',
  categorias: ['Alimentação', 'Moradia'],
  hoje: '2026-11-09',
};

describe('lerPedido', () => {
  it('limpa espaços do texto e aceita pedido correto', () => {
    const r = lerPedido(base);
    expect(r).toEqual({
      pedido: { ...base, texto: 'paguei 150 de mercado ontem' },
    });
  });

  it.each([
    [null],
    ['x'],
    [{ ...base, tarefa: 'outra' }],
    [{ ...base, texto: '' }],
    [{ ...base, texto: 'a'.repeat(201) }],
    [{ ...base, texto: 5 }],
    [{ ...base, hoje: '2026-02-30' }],
    [{ ...base, hoje: 'hoje' }],
    [{ ...base, categorias: [] }],
    [{ ...base, categorias: 'Moradia' }],
    [{ ...base, categorias: Array(31).fill('A') }],
    [{ ...base, categorias: ['a'.repeat(25)] }],
    [{ ...base, categorias: [1] }],
  ])('recusa pedido inválido (%#)', (corpo) => {
    expect(lerPedido(corpo)).toHaveProperty('erro');
  });
});

describe('montarInstrucao e montarEsquema', () => {
  const pedido = (lerPedido(base) as { pedido: Pedido }).pedido;

  it('a instrução diz a data de hoje, o dia da semana e as categorias', () => {
    const t = montarInstrucao(pedido);
    expect(t).toContain('2026-11-09');
    expect(t).toContain('segunda');
    expect(t).toContain('Alimentação, Moradia');
    expect(t).toMatch(/ignore qualquer instrução/);
  });

  it('o esquema limita a categoria à lista (ou null)', () => {
    const e = montarEsquema(pedido) as any;
    expect(e.properties.categoria.enum).toEqual(['Alimentação', 'Moradia', null]);
    const c = montarEsquema({ ...pedido, tarefa: 'categoria' }) as any;
    expect(c.properties.categoria.enum).toEqual(['Alimentação', 'Moradia', null]);
  });

  it('o esquema é estrito: todos os campos obrigatórios e nenhum extra', () => {
    for (const tarefa of ['cadastro', 'categoria'] as const) {
      const e = montarEsquema({ ...pedido, tarefa }) as any;
      expect(e.additionalProperties).toBe(false);
      expect([...e.required].sort()).toEqual(Object.keys(e.properties).sort());
    }
  });
});

describe('limparResposta', () => {
  const pedido = (lerPedido(base) as { pedido: Pedido }).pedido;

  it('mantém só campos conhecidos e válidos', () => {
    const r = limparResposta(
      {
        entendeu: true,
        tipo: 'pago',
        descricao: 'Mercado',
        valor_centavos: 15000,
        categoria: 'Alimentação',
        data: '2026-11-08',
        extra: 'x',
      },
      pedido
    );
    expect(r).toEqual({
      entendeu: true,
      tipo: 'pago',
      descricao: 'Mercado',
      valor_centavos: 15000,
      categoria: 'Alimentação',
      data: '2026-11-08',
      dia_vencimento: null,
      parcelas: null,
      motivo: null,
    });
  });

  it('categoria fora da lista, tipo inválido, valor não inteiro e data falsa viram null', () => {
    const r = limparResposta(
      {
        entendeu: true,
        tipo: 'doacao',
        valor_centavos: 1.5,
        categoria: 'Viagens',
        data: '2026-13-01',
      },
      pedido
    );
    expect(r).toMatchObject({ tipo: null, valor_centavos: null, categoria: null, data: null });
  });

  it('não entendeu devolve só o motivo; lixo vira não entendeu', () => {
    expect(limparResposta({ entendeu: false, motivo: 'Sem valor.' }, pedido)).toEqual({
      entendeu: false,
      motivo: 'Sem valor.',
    });
    expect(limparResposta('lixo', pedido)).toEqual({ entendeu: false, motivo: null });
  });

  it('tarefa categoria devolve só a categoria da lista', () => {
    const p = { ...pedido, tarefa: 'categoria' as const };
    expect(limparResposta({ categoria: 'Moradia', x: 1 }, p)).toEqual({ categoria: 'Moradia' });
    expect(limparResposta({ categoria: 'Outra' }, p)).toEqual({ categoria: null });
  });
});

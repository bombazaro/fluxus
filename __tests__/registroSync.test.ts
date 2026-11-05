import {
  assinaturaDe,
  paraLinha,
  paraRegistro,
  registroExcluido,
  TABELAS_SYNC,
  definicaoDe,
} from '../src/domain/sync/registro';

const uidDoPai = (tabela: string, id: number) => `${tabela}-uid-${id}`;
const idDoPai = (tabela: string, uid: string) => {
  const m = uid.match(new RegExp(`^${tabela}-uid-(\\d+)$`));
  return m ? Number(m[1]) : null;
};

const EXEMPLOS: Record<string, Record<string, string | number | null>> = {
  categorias: { id: 1, nome: 'Moradia', cor: '#0F766E', icone: 'home' },
  pessoas: { id: 1, nome: 'Eu' },
  contas: {
    id: 7,
    nome: 'Aluguel',
    categoria_id: 1,
    tipo: 'fixa',
    valor_centavos: 150000,
    dia_vencimento: 5,
    data_unica: null,
    parcelas_total: null,
    data_inicio: '2026-01-01',
    data_fim: null,
    ativa: 1,
    compartilhada: 0,
    sem_vencimento: 0,
    criado_em: '2026-01-01T00:00:00.000Z',
  },
  lancamentos: {
    id: 9,
    conta_id: 7,
    mes_ref: '2026-11',
    vencimento: '2026-11-05',
    valor_centavos: 150000,
    pago: 1,
    pago_em: '2026-11-04T12:00:00.000Z',
    parcela_numero: null,
  },
  lancamentos_ignorados: { conta_id: 7, mes_ref: '2026-12' },
  divisoes: { id: 3, lancamento_id: 9, pessoa_id: 1, valor_centavos: 75000, pago: 0 },
  rendas: {
    id: 2,
    nome: 'Salário',
    valor_centavos: 650000,
    dia_recebimento: 5,
    tipo: 'fixa',
    mes_ref: null,
    ativa: 1,
    criado_em: '2026-01-01T00:00:00.000Z',
  },
  rendas_recebidas: {
    id: 4,
    renda_id: 2,
    mes_ref: '2026-11',
    valor_centavos: 650000,
    recebida_em: '2026-11-05T09:00:00.000Z',
  },
  reserva_meta: { id: 1, valor_meta_centavos: 1000000, tipo_meta: 'fixo', meses_gastos: 6 },
  reserva_aportes: { id: 5, valor_centavos: 20000, data: '2026-11-01', observacao: null },
};

describe('TABELAS_SYNC', () => {
  it('lista os pais antes dos filhos', () => {
    const vistas = new Set<string>();
    for (const def of TABELAS_SYNC) {
      for (const pai of Object.values(def.pais)) expect(vistas.has(pai)).toBe(true);
      vistas.add(def.tabela);
    }
  });

  it('cobre todas as tabelas sincronizadas e as configurações', () => {
    expect(TABELAS_SYNC.map((t) => t.tabela).sort()).toEqual(
      [...Object.keys(EXEMPLOS), 'configuracoes'].sort()
    );
  });
});

describe('paraRegistro / paraLinha', () => {
  it.each(Object.keys(EXEMPLOS))('%s: ida e volta devolve a linha original', (tabela) => {
    const def = definicaoDe(tabela as never);
    const linha = {
      ...EXEMPLOS[tabela],
      uid: `${tabela}-u`,
      atualizado_em: '2026-11-05T10:00:00.000Z',
    };

    const registro = paraRegistro(def, linha, uidDoPai);
    expect(registro.uid).toBe(`${tabela}-u`);
    expect(registro.atualizadoEm).toBe('2026-11-05T10:00:00.000Z');
    expect(registro.excluidoEm).toBeNull();
    // a identidade local não viaja
    expect(registro.dados).not.toHaveProperty('id');
    expect(registro.dados).not.toHaveProperty('uid');
    expect(registro.dados).not.toHaveProperty('atualizado_em');

    const volta = paraLinha(def, registro, idDoPai);
    expect(volta.status).toBe('ok');
    if (volta.status !== 'ok') return;
    const { id: _id, ...esperado } = EXEMPLOS[tabela];
    expect(volta.valores).toEqual(esperado);
  });

  it('chaves estrangeiras viajam como uid do pai, não como número', () => {
    const def = definicaoDe('contas');
    const r = paraRegistro(
      def,
      { ...EXEMPLOS.contas, uid: 'c', atualizado_em: '2026-11-05T10:00:00.000Z' },
      uidDoPai
    );
    expect(r.dados).toMatchObject({ categoria_uid: 'categorias-uid-1' });
    expect(r.dados).not.toHaveProperty('categoria_id');
  });

  it('pai que ainda não existe aqui é avisado em vez de virar nulo', () => {
    const def = definicaoDe('lancamentos');
    const r = paraRegistro(
      definicaoDe('lancamentos'),
      { ...EXEMPLOS.lancamentos, uid: 'l', atualizado_em: '2026-11-05T10:00:00.000Z' },
      uidDoPai
    );
    const semPai = paraLinha(def, r, () => null);
    expect(semPai).toEqual({
      status: 'pai-ausente',
      pai: { tabela: 'contas', uid: 'contas-uid-7' },
    });
  });

  it('configuração usa a chave como uid e só o valor viaja', () => {
    const def = definicaoDe('configuracoes');
    const r = paraRegistro(
      def,
      { chave: 'nome', valor: 'Ana', atualizado_em: '2026-11-05T10:00:00.000Z' },
      uidDoPai
    );
    expect(r).toMatchObject({ tabela: 'configuracoes', uid: 'nome', dados: { valor: 'Ana' } });
    const volta = paraLinha(def, r, idDoPai);
    expect(volta).toEqual({ status: 'ok', valores: { chave: 'nome', valor: 'Ana' } });
  });

  it('configuração do aparelho nunca sai deste aparelho e é ignorada se chegar', () => {
    const def = definicaoDe('configuracoes');
    expect(() =>
      paraRegistro(
        def,
        { chave: 'notificacaoHora', valor: '7', atualizado_em: '2026-11-05T10:00:00.000Z' },
        uidDoPai
      )
    ).toThrow(/aparelho/);
    expect(
      paraLinha(
        def,
        {
          tabela: 'configuracoes',
          uid: 'notificacaoHora',
          dados: { valor: '7' },
          atualizadoEm: '2026-11-05T10:00:00.000Z',
          excluidoEm: null,
        },
        idDoPai
      )
    ).toEqual({ status: 'ignorada' });
  });

  it('registro excluído não carrega dados e usa a data da exclusão como versão', () => {
    expect(registroExcluido('contas', 'c1', '2026-11-05T10:00:00.000Z')).toEqual({
      tabela: 'contas',
      uid: 'c1',
      dados: null,
      atualizadoEm: '2026-11-05T10:00:00.000Z',
      excluidoEm: '2026-11-05T10:00:00.000Z',
    });
  });

  it('a assinatura não depende da ordem das chaves', () => {
    expect(assinaturaDe({ a: 1, b: 'x' })).toBe(assinaturaDe({ b: 'x', a: 1 }));
    expect(assinaturaDe({ a: 1 })).not.toBe(assinaturaDe({ a: 2 }));
    expect(assinaturaDe(null)).toBe('excluida');
  });
});

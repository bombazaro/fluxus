import { totaisPorCategoria } from '../src/domain/totaisPorCategoria';
import { LancamentoComDetalhes } from '../src/types';

describe('totaisPorCategoria', () => {
  const criarLancamento = (
    id: number,
    categoriaId: number,
    valorCentavos: number,
    extra?: Partial<LancamentoComDetalhes>
  ): LancamentoComDetalhes => ({
    id,
    conta_id: id,
    mes_ref: '2026-05',
    vencimento: '2026-05-10',
    valor_centavos: valorCentavos,
    pago: 0,
    pago_em: null,
    parcela_numero: null,
    conta_nome: `Conta ${id}`,
    conta_tipo: 'fixa',
    categoria_id: categoriaId,
    categoria_nome: `Categoria ${categoriaId}`,
    categoria_cor: '#000000',
    categoria_icone: 'home',
    compartilhada: 0,
    sem_vencimento: 0,
    parcelas_total: null,
    ...extra,
  });

  it('soma por categoria e ordena do maior para o menor', () => {
    const totais = totaisPorCategoria([
      criarLancamento(1, 1, 5000),
      criarLancamento(2, 2, 20000),
      criarLancamento(3, 1, 7000),
    ]);

    expect(totais.map((t) => [t.categoriaId, t.totalCentavos])).toEqual([
      [2, 20000],
      [1, 12000],
    ]);
  });

  it('conta só a parte do usuário nas compartilhadas', () => {
    const totais = totaisPorCategoria([
      criarLancamento(1, 1, 10000, { compartilhada: 1, minha_parte_centavos: 4000 }),
    ]);

    expect(totais[0].totalCentavos).toBe(4000);
  });

  it('devolve lista vazia sem lançamentos', () => {
    expect(totaisPorCategoria([])).toEqual([]);
  });
});

import { compararMeses } from '../src/domain/compararMeses';
import { LancamentoComDetalhes } from '../src/types';

let proximoId = 1;
function lanc(
  categoria: { id: number; nome: string },
  valor: number,
  extra: Partial<LancamentoComDetalhes> = {}
): LancamentoComDetalhes {
  return {
    id: proximoId++,
    conta_id: 1,
    mes_ref: '2026-10',
    vencimento: '2026-10-10',
    valor_centavos: valor,
    pago: 0,
    pago_em: null,
    parcela_numero: null,
    conta_nome: 'Conta',
    conta_tipo: 'fixa',
    categoria_id: categoria.id,
    categoria_nome: categoria.nome,
    categoria_cor: '#000',
    categoria_icone: 'home',
    compartilhada: 0,
    sem_vencimento: 0,
    parcelas_total: null,
    ...extra,
  };
}

const MORADIA = { id: 1, nome: 'Moradia' };
const LAZER = { id: 2, nome: 'Lazer' };
const SAUDE = { id: 3, nome: 'Saúde' };

describe('compararMeses', () => {
  it('compara o total e diz quanto % mudou', () => {
    const r = compararMeses([lanc(MORADIA, 112000)], [lanc(MORADIA, 100000)]);
    expect(r.totalAtual).toBe(112000);
    expect(r.totalAnterior).toBe(100000);
    expect(r.diferenca).toBe(12000);
    expect(r.percentual).toBeCloseTo(0.12);
  });

  it('compara cada categoria, inclusive as que só existem em um dos meses', () => {
    const r = compararMeses(
      [lanc(MORADIA, 100000), lanc(LAZER, 30000)],
      [lanc(MORADIA, 100000), lanc(SAUDE, 20000)]
    );
    const porNome = Object.fromEntries(r.categorias.map((c) => [c.nome, c]));

    expect(porNome.Moradia).toMatchObject({ atual: 100000, anterior: 100000, diferenca: 0 });
    expect(porNome.Lazer).toMatchObject({ atual: 30000, anterior: 0, percentual: null });
    expect(porNome['Saúde']).toMatchObject({ atual: 0, anterior: 20000, percentual: -1 });
  });

  it('ordena as categorias pelo gasto deste mês', () => {
    const r = compararMeses([lanc(LAZER, 30000), lanc(MORADIA, 100000)], [lanc(SAUDE, 1)]);
    expect(r.categorias.map((c) => c.nome)).toEqual(['Moradia', 'Lazer', 'Saúde']);
  });

  it('destaca a categoria que mais subiu em reais', () => {
    const r = compararMeses(
      [lanc(MORADIA, 110000), lanc(LAZER, 50000)],
      [lanc(MORADIA, 100000), lanc(LAZER, 20000)]
    );
    expect(r.maiorAlta?.nome).toBe('Lazer');
  });

  it('sem nenhuma alta, não destaca nada', () => {
    const r = compararMeses([lanc(MORADIA, 90000)], [lanc(MORADIA, 100000)]);
    expect(r.maiorAlta).toBeNull();
  });

  it('sem mês anterior, o percentual é nulo (não dá para comparar)', () => {
    const r = compararMeses([lanc(MORADIA, 90000)], []);
    expect(r.percentual).toBeNull();
  });

  it('usa só a minha parte nas contas compartilhadas, se pedido', () => {
    const dividida = lanc(MORADIA, 100000, { compartilhada: 1, minha_parte_centavos: 50000 });
    expect(compararMeses([dividida], []).totalAtual).toBe(50000);
    expect(compararMeses([dividida], [], false).totalAtual).toBe(100000);
  });
});

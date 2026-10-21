import { planejarLembretes, LancamentoParaLembrete } from '../src/domain/planejarLembretes';
import { formatarMoeda } from '../src/utils/formatadores';

function lancamento(extra: Partial<LancamentoParaLembrete> = {}): LancamentoParaLembrete {
  return {
    id: 1,
    conta_id: 7,
    conta_nome: 'Internet',
    vencimento: '2026-10-25',
    valor_centavos: 10000,
    sem_vencimento: 0,
    ...extra,
  };
}

const CONFIG = { notificacaoHora: 9, notificacaoDiasAntes: 1 };
// 21/10/2026 às 15h, horário local
const AGORA = new Date(2026, 9, 21, 15, 0);

describe('planejarLembretes', () => {
  it('agenda 1 dia antes e no dia, no horário escolhido', () => {
    const lembretes = planejarLembretes([lancamento()], CONFIG, AGORA);

    expect(lembretes.map((l) => l.quando)).toEqual([
      new Date(2026, 9, 24, 9, 0),
      new Date(2026, 9, 25, 9, 0),
    ]);
    expect(lembretes[0]).toMatchObject({
      identificador: 'lancamento-1-antes',
      titulo: 'Internet vence amanhã',
      corpo: `${formatarMoeda(10000)} · vence em 25/10`,
      contaId: 7,
    });
    expect(lembretes[1]).toMatchObject({
      identificador: 'lancamento-1-dia',
      titulo: 'Internet vence hoje',
    });
  });

  it('com 3 dias de antecedência, diz quantos dias faltam', () => {
    const lembretes = planejarLembretes(
      [lancamento({ vencimento: '2026-10-30' })],
      { notificacaoHora: 9, notificacaoDiasAntes: 3 },
      AGORA
    );
    expect(lembretes[0].titulo).toBe('Internet vence em 3 dias');
    expect(lembretes[0].quando).toEqual(new Date(2026, 9, 27, 9, 0));
  });

  it('com 0 dias de antecedência, avisa só no dia', () => {
    const lembretes = planejarLembretes(
      [lancamento()],
      { notificacaoHora: 9, notificacaoDiasAntes: 0 },
      AGORA
    );
    expect(lembretes.map((l) => l.identificador)).toEqual(['lancamento-1-dia']);
  });

  it('não agenda nada no passado', () => {
    // Vence amanhã: o aviso de "1 dia antes" seria hoje às 9h, que já passou
    const lembretes = planejarLembretes([lancamento({ vencimento: '2026-10-22' })], CONFIG, AGORA);
    expect(lembretes.map((l) => l.identificador)).toEqual(['lancamento-1-dia']);

    expect(planejarLembretes([lancamento({ vencimento: '2026-10-21' })], CONFIG, AGORA)).toEqual(
      []
    );
  });

  it('conta sem vencimento avisa no último dia do mês', () => {
    const lembretes = planejarLembretes(
      [lancamento({ vencimento: '2026-10-31', sem_vencimento: 1 })],
      CONFIG,
      AGORA
    );
    expect(lembretes).toHaveLength(1);
    expect(lembretes[0]).toMatchObject({
      titulo: 'Internet: último dia do mês para pagar',
      quando: new Date(2026, 9, 31, 9, 0),
    });
  });

  it('ordena pelo horário e respeita o limite', () => {
    const lembretes = planejarLembretes(
      [
        lancamento({ id: 2, vencimento: '2026-11-10' }),
        lancamento({ id: 1, vencimento: '2026-10-25' }),
      ],
      CONFIG,
      AGORA,
      3
    );
    expect(lembretes.map((l) => l.identificador)).toEqual([
      'lancamento-1-antes',
      'lancamento-1-dia',
      'lancamento-2-antes',
    ]);
  });
});

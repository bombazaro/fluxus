import { agruparAcertos, textoAcerto, LinhaAcerto } from '../src/domain/acertos';
import { formatarMoeda } from '../src/utils/formatadores';

function linha(extra: Partial<LinhaAcerto>): LinhaAcerto {
  return {
    divisao_id: 1,
    pessoa_id: 2,
    pessoa_nome: 'Ana',
    conta_nome: 'Aluguel',
    mes_ref: '2026-10',
    valor_centavos: 50000,
    ...extra,
  };
}

describe('agruparAcertos', () => {
  it('soma o que cada pessoa deve, da maior dívida para a menor', () => {
    const grupos = agruparAcertos([
      linha({ divisao_id: 1, pessoa_id: 2, pessoa_nome: 'Ana', valor_centavos: 50000 }),
      linha({ divisao_id: 2, pessoa_id: 3, pessoa_nome: 'Bia', valor_centavos: 90000 }),
      linha({
        divisao_id: 3,
        pessoa_id: 2,
        pessoa_nome: 'Ana',
        conta_nome: 'Luz',
        valor_centavos: 6000,
      }),
    ]);

    expect(grupos.map((g) => [g.nome, g.totalCentavos, g.itens.length])).toEqual([
      ['Bia', 90000, 1],
      ['Ana', 56000, 2],
    ]);
  });

  it('itens de cada pessoa do mês mais antigo para o mais novo', () => {
    const [ana] = agruparAcertos([
      linha({ divisao_id: 1, mes_ref: '2026-10' }),
      linha({ divisao_id: 2, mes_ref: '2026-09' }),
    ]);
    expect(ana.itens.map((i) => i.mes_ref)).toEqual(['2026-09', '2026-10']);
  });

  it('sem pendências, lista vazia', () => {
    expect(agruparAcertos([])).toEqual([]);
  });
});

describe('textoAcerto', () => {
  it('monta o resumo para mandar no WhatsApp', () => {
    const [ana] = agruparAcertos([
      linha({ divisao_id: 1, conta_nome: 'Aluguel', mes_ref: '2026-10', valor_centavos: 50000 }),
      linha({ divisao_id: 2, conta_nome: 'Luz', mes_ref: '2026-10', valor_centavos: 6000 }),
    ]);
    expect(textoAcerto(ana)).toBe(
      [
        'Oi, Ana! Resumo das contas divididas:',
        '',
        `• Aluguel (Out/26): ${formatarMoeda(50000)}`,
        `• Luz (Out/26): ${formatarMoeda(6000)}`,
        '',
        `Total: ${formatarMoeda(56000)}`,
      ].join('\n')
    );
  });
});

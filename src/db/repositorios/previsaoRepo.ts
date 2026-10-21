import { SQLiteDatabase } from 'expo-sqlite';
import { Conta, Renda, RendaRecebida } from '@/src/types';
import { DadosPrevisao, LancamentoPrevisao, UltimaParcela } from '@/src/domain/preverSaldo';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { calcularMediaLancamentos } from '@/src/domain/sugerirValor';
import { lancamentosRepo } from './lancamentosRepo';

export const previsaoRepo = {
  /** Tudo que o preverSaldo precisa para os meses de mesInicial em diante. */
  async carregar(
    db: SQLiteDatabase,
    mesInicial: string,
    quantidadeMeses: number,
    mesesMedia: number
  ): Promise<DadosPrevisao> {
    const mesFinal = adicionarMeses(mesInicial, quantidadeMeses - 1);

    const contas = await db.getAllAsync<Conta>('SELECT * FROM contas WHERE ativa = 1;');

    // Lançamentos do período, com a parte do usuário quando divididos
    const lancamentos = await db.getAllAsync<
      LancamentoPrevisao & { dividido: number; minha_parte: number }
    >(
      `SELECT l.id, l.conta_id, l.mes_ref, l.valor_centavos,
         EXISTS (SELECT 1 FROM divisoes d WHERE d.lancamento_id = l.id) AS dividido,
         COALESCE((SELECT SUM(d.valor_centavos) FROM divisoes d
                   INNER JOIN pessoas p ON p.id = d.pessoa_id
                   WHERE d.lancamento_id = l.id AND p.nome = 'Eu'), 0) AS minha_parte
       FROM lancamentos l
       WHERE l.mes_ref BETWEEN ? AND ?;`,
      [mesInicial, mesFinal]
    );

    const ignorados = await db.getAllAsync<{ conta_id: number; mes_ref: string }>(
      'SELECT conta_id, mes_ref FROM lancamentos_ignorados WHERE mes_ref BETWEEN ? AND ?;',
      [mesInicial, mesFinal]
    );

    const rendas = await db.getAllAsync<Renda>('SELECT * FROM rendas;');
    const recebidas = await db.getAllAsync<RendaRecebida>(
      'SELECT * FROM rendas_recebidas WHERE mes_ref BETWEEN ? AND ?;',
      [mesInicial, mesFinal]
    );

    const mediaVariaveis: Record<number, number> = {};
    for (const c of contas.filter((c) => c.tipo === 'variavel')) {
      const pagos = await lancamentosRepo.listarPagosDaConta(db, c.id, mesesMedia);
      const media = calcularMediaLancamentos(pagos, mesesMedia);
      if (media !== null) mediaVariaveis[c.id] = media;
    }

    // Fração do usuário na divisão mais recente de cada conta compartilhada
    const fracoes = await db.getAllAsync<{ conta_id: number; valor: number; minha_parte: number }>(
      `SELECT l.conta_id, l.valor_centavos AS valor,
         COALESCE(SUM(CASE WHEN p.nome = 'Eu' THEN d.valor_centavos ELSE 0 END), 0) AS minha_parte
       FROM lancamentos l
       INNER JOIN divisoes d ON d.lancamento_id = l.id
       INNER JOIN pessoas p ON p.id = d.pessoa_id
       WHERE l.id IN (
         SELECT MAX(l2.id) FROM lancamentos l2
         WHERE EXISTS (SELECT 1 FROM divisoes x WHERE x.lancamento_id = l2.id)
         GROUP BY l2.conta_id
       )
       GROUP BY l.id;`
    );
    const fracaoMinhaParte: Record<number, number> = {};
    for (const f of fracoes) {
      if (f.valor > 0) fracaoMinhaParte[f.conta_id] = f.minha_parte / f.valor;
    }

    return {
      contas,
      lancamentos: lancamentos.map(({ dividido, minha_parte, ...l }) =>
        dividido === 1 ? { ...l, minha_parte_centavos: minha_parte } : l
      ),
      ignorados,
      rendas,
      recebidas,
      mediaVariaveis,
      fracaoMinhaParte,
    };
  },

  /** Última parcela de cada conta parcelada ativa e quantas ainda faltam pagar. */
  async ultimasParcelas(db: SQLiteDatabase): Promise<UltimaParcela[]> {
    return await db.getAllAsync<UltimaParcela>(
      `SELECT c.id AS conta_id, c.nome, MAX(l.mes_ref) AS ultimo_mes,
         c.valor_centavos AS valor_parcela_centavos,
         SUM(CASE WHEN l.pago = 0 THEN 1 ELSE 0 END) AS parcelas_restantes
       FROM contas c
       INNER JOIN lancamentos l ON l.conta_id = c.id
       WHERE c.tipo = 'parcelada' AND c.ativa = 1
       GROUP BY c.id;`
    );
  },
};

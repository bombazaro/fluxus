import {
  ajustarDiaDoMes,
  adicionarMeses,
  gerarLancamentosParaConta,
  obterUltimoDiaDoMes,
} from '../src/domain/gerarLancamentos';

describe('gerarLancamentos e regras de datas', () => {
  describe('obterUltimoDiaDoMes e ajustarDiaDoMes', () => {
    it('retorna 31 para janeiro, março, maio, julho, agosto, outubro, dezembro', () => {
      expect(obterUltimoDiaDoMes(2026, 1)).toBe(31);
      expect(obterUltimoDiaDoMes(2026, 3)).toBe(31);
      expect(obterUltimoDiaDoMes(2026, 5)).toBe(31);
    });

    it('retorna 30 para abril, junho, setembro, novembro', () => {
      expect(obterUltimoDiaDoMes(2026, 4)).toBe(30);
      expect(obterUltimoDiaDoMes(2026, 6)).toBe(30);
      expect(obterUltimoDiaDoMes(2026, 9)).toBe(30);
      expect(obterUltimoDiaDoMes(2026, 11)).toBe(30);
    });

    it('retorna 28 para fevereiro de ano não bissexto (2026)', () => {
      expect(obterUltimoDiaDoMes(2026, 2)).toBe(28);
    });

    it('retorna 29 para fevereiro de ano bissexto (2024)', () => {
      expect(obterUltimoDiaDoMes(2024, 2)).toBe(29);
    });

    it('ajusta dia 31 para 30 de abril', () => {
      expect(ajustarDiaDoMes(2026, 4, 31)).toBe('2026-04-30');
    });

    it('ajusta dia 31 para 28 de fevereiro de 2026', () => {
      expect(ajustarDiaDoMes(2026, 2, 31)).toBe('2026-02-28');
    });

    it('ajusta dia 31 para 29 de fevereiro de 2024', () => {
      expect(ajustarDiaDoMes(2024, 2, 31)).toBe('2024-02-29');
    });

    it('mantém dia quando é válido no mês', () => {
      expect(ajustarDiaDoMes(2026, 5, 10)).toBe('2026-05-10');
      expect(ajustarDiaDoMes(2026, 5, 31)).toBe('2026-05-31');
    });
  });

  describe('adicionarMeses', () => {
    it('avança meses no mesmo ano', () => {
      expect(adicionarMeses('2026-01', 2)).toBe('2026-03');
    });

    it('avança meses virando o ano', () => {
      expect(adicionarMeses('2026-11', 3)).toBe('2027-02');
    });

    it('recua meses quando negativo', () => {
      expect(adicionarMeses('2026-03', -2)).toBe('2026-01');
      expect(adicionarMeses('2026-01', -1)).toBe('2025-12');
    });
  });

  describe('gerarLancamentosParaConta', () => {
    it('gera 1 lançamento para conta única', () => {
      const lancamentos = gerarLancamentosParaConta({
        id: 10,
        nome: 'IPVA',
        categoria_id: 3,
        tipo: 'unica',
        valor_centavos: 120000,
        dia_vencimento: null,
        data_unica: '2026-03-15',
        parcelas_total: null,
        data_inicio: '2026-03-15',
        data_fim: null,
        ativa: 1,
        compartilhada: 0,
        sem_vencimento: 0,
      });

      expect(lancamentos).toHaveLength(1);
      expect(lancamentos[0].mes_ref).toBe('2026-03');
      expect(lancamentos[0].vencimento).toBe('2026-03-15');
      expect(lancamentos[0].valor_centavos).toBe(120000);
      expect(lancamentos[0].parcela_numero).toBeNull();
    });

    it('gera N lançamentos para conta parcelada com ajuste de dia 31', () => {
      const lancamentos = gerarLancamentosParaConta({
        id: 20,
        nome: 'Celular 3x',
        categoria_id: 7,
        tipo: 'parcelada',
        valor_centavos: 50000,
        dia_vencimento: 31,
        data_unica: null,
        parcelas_total: 3,
        data_inicio: '2026-01-31',
        data_fim: null,
        ativa: 1,
        compartilhada: 0,
        sem_vencimento: 0,
      });

      expect(lancamentos).toHaveLength(3);

      // Parcela 1: Janeiro tem 31 dias
      expect(lancamentos[0].mes_ref).toBe('2026-01');
      expect(lancamentos[0].vencimento).toBe('2026-01-31');
      expect(lancamentos[0].parcela_numero).toBe(1);

      // Parcela 2: Fevereiro tem 28 dias
      expect(lancamentos[1].mes_ref).toBe('2026-02');
      expect(lancamentos[1].vencimento).toBe('2026-02-28');
      expect(lancamentos[1].parcela_numero).toBe(2);

      // Parcela 3: Março tem 31 dias
      expect(lancamentos[2].mes_ref).toBe('2026-03');
      expect(lancamentos[2].vencimento).toBe('2026-03-31');
      expect(lancamentos[2].parcela_numero).toBe(3);
    });

    it('conta fixa sem vencimento vence no último dia do mês', () => {
      const [lancamento] = gerarLancamentosParaConta({
        id: 30,
        nome: 'Mercado',
        categoria_id: 2,
        tipo: 'fixa',
        valor_centavos: 80000,
        dia_vencimento: null,
        data_unica: null,
        parcelas_total: null,
        data_inicio: '2026-02-01',
        data_fim: null,
        ativa: 1,
        compartilhada: 0,
        sem_vencimento: 1,
      });

      expect(lancamento.vencimento).toBe('2026-02-28');
    });

    it('conta única sem vencimento fica no último dia do mês de início', () => {
      const [lancamento] = gerarLancamentosParaConta({
        id: 31,
        nome: 'Presente',
        categoria_id: 5,
        tipo: 'unica',
        valor_centavos: 15000,
        dia_vencimento: null,
        data_unica: null,
        parcelas_total: null,
        data_inicio: '2026-04-01',
        data_fim: null,
        ativa: 1,
        compartilhada: 0,
        sem_vencimento: 1,
      });

      expect(lancamento).toMatchObject({ mes_ref: '2026-04', vencimento: '2026-04-30' });
    });

    it('parcelada sem vencimento vence no último dia de cada mês', () => {
      const lancamentos = gerarLancamentosParaConta({
        id: 32,
        nome: 'Curso 2x',
        categoria_id: 6,
        tipo: 'parcelada',
        valor_centavos: 20000,
        dia_vencimento: null,
        data_unica: null,
        parcelas_total: 2,
        data_inicio: '2026-01-01',
        data_fim: null,
        ativa: 1,
        compartilhada: 0,
        sem_vencimento: 1,
      });

      expect(lancamentos.map((l) => l.vencimento)).toEqual(['2026-01-31', '2026-02-28']);
    });
  });
});

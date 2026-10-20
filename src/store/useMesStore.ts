import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { LancamentoComDetalhes, Renda } from '@/src/types';
import { ResumoMes, resumoDoMes } from '@/src/domain/resumoDoMes';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { divisoesRepo } from '@/src/db/repositorios/divisoesRepo';

export type FiltroSituacao = 'todas' | 'pendentes' | 'pagas';

export function obterMesAtualIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

export function obterHojeIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

interface ItemDesfazer {
  id: number;
  pagoAnterior: number;
  timestamp: number;
}

export interface MesState {
  mesRef: string;
  lancamentos: LancamentoComDetalhes[];
  rendas: Renda[];
  resumo: ResumoMes;
  carregando: boolean;
  erro: string | null;

  // Filtros
  filtroSituacao: FiltroSituacao;
  filtroCategoriaId: number | null;
  busca: string;

  // Desfazer
  ultimoDesfeito: ItemDesfazer | null;

  // Ações
  setMesRef: (mesRef: string) => void;
  trocarMes: (deltaMeses: number, db: SQLiteDatabase) => Promise<void>;
  irParaHoje: (db: SQLiteDatabase) => Promise<void>;
  carregarMes: (db: SQLiteDatabase, mesAlvo?: string) => Promise<void>;
  marcarPago: (db: SQLiteDatabase, id: number, pago: boolean) => Promise<void>;
  desfazerUltimoPago: (db: SQLiteDatabase) => Promise<void>;
  limparDesfazer: () => void;
  atualizarValorLancamento: (
    db: SQLiteDatabase,
    id: number,
    valorCentavos: number
  ) => Promise<void>;
  setFiltroSituacao: (filtro: FiltroSituacao) => void;
  setFiltroCategoriaId: (catId: number | null) => void;
  setBusca: (busca: string) => void;
}

const resumoInicial: ResumoMes = {
  totalContas: 0,
  totalPago: 0,
  faltaPagar: 0,
  rendaTotal: 0,
  sobra: 0,
  sobraAtual: 0,
  percentualUsado: 0,
};

export const useMesStore = create<MesState>((set, get) => ({
  mesRef: obterMesAtualIso(),
  lancamentos: [],
  rendas: [],
  resumo: resumoInicial,
  carregando: false,
  erro: null,
  filtroSituacao: 'todas',
  filtroCategoriaId: null,
  busca: '',
  ultimoDesfeito: null,

  setMesRef: (mesRef) => set({ mesRef }),

  trocarMes: async (deltaMeses, db) => {
    const proximoMes = adicionarMeses(get().mesRef, deltaMeses);
    set({ mesRef: proximoMes });
    await get().carregarMes(db, proximoMes);
  },

  irParaHoje: async (db) => {
    const hojeMes = obterMesAtualIso();
    set({ mesRef: hojeMes });
    await get().carregarMes(db, hojeMes);
  },

  carregarMes: async (db, mesAlvo) => {
    const mes = mesAlvo || get().mesRef;
    set({ carregando: true, erro: null });

    try {
      // 1. Garante que lançamentos de contas fixas e variáveis existam
      await lancamentosRepo.garantirMes(db, mes);

      // 2. Busca lançamentos com detalhes de categoria e conta
      const lancamentos = await lancamentosRepo.listarPorMes(db, mes);

      // 3. Busca divisões para associar a parte do usuário se for compartilhada
      const divisoes = await divisoesRepo.listarPorMes(db, mes);
      const divisoesPorLancamento = new Map<number, number>();
      for (const d of divisoes) {
        if (d.pessoa_nome === 'Eu') {
          divisoesPorLancamento.set(d.lancamento_id, d.valor_centavos);
        }
      }

      for (const l of lancamentos) {
        if (l.compartilhada === 1 && divisoesPorLancamento.has(l.id)) {
          l.minha_parte_centavos = divisoesPorLancamento.get(l.id);
        }
      }

      // 4. Busca rendas ativas
      const rendas = await rendasRepo.listarAtivas(db);

      // 5. Calcula resumo
      const resumo = resumoDoMes(lancamentos, rendas);

      set({
        mesRef: mes,
        lancamentos,
        rendas,
        resumo,
        carregando: false,
      });
    } catch (err: any) {
      console.error('Erro ao carregar dados do mês:', err);
      set({
        erro: err?.message || 'Erro ao carregar mês',
        carregando: false,
      });
    }
  },

  marcarPago: async (db, id, pago) => {
    const lancamento = get().lancamentos.find((l) => l.id === id);
    if (!lancamento) return;

    const pagoAnterior = lancamento.pago;

    // Atualização otimista no estado local
    const novosLancamentos = get().lancamentos.map((l) =>
      l.id === id
        ? {
            ...l,
            pago: (pago ? 1 : 0) as 0 | 1,
            pago_em: pago ? new Date().toISOString() : null,
          }
        : l
    );
    const novoResumo = resumoDoMes(novosLancamentos, get().rendas);

    set({
      lancamentos: novosLancamentos,
      resumo: novoResumo,
      ultimoDesfeito: {
        id,
        pagoAnterior,
        timestamp: Date.now(),
      },
    });

    try {
      await lancamentosRepo.marcarPago(db, id, pago);
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
      // Reverter se falhar no banco
      await get().carregarMes(db);
    }
  },

  desfazerUltimoPago: async (db) => {
    const desfazer = get().ultimoDesfeito;
    if (!desfazer) return;

    set({ ultimoDesfeito: null });
    await get().marcarPago(db, desfazer.id, desfazer.pagoAnterior === 1);
  },

  limparDesfazer: () => set({ ultimoDesfeito: null }),

  atualizarValorLancamento: async (db, id, valorCentavos) => {
    try {
      await lancamentosRepo.atualizarValor(db, id, valorCentavos);
      await get().carregarMes(db);
    } catch (err) {
      console.error('Erro ao atualizar valor do lançamento:', err);
    }
  },

  setFiltroSituacao: (filtroSituacao) => set({ filtroSituacao }),
  setFiltroCategoriaId: (filtroCategoriaId) => set({ filtroCategoriaId }),
  setBusca: (busca) => set({ busca }),
}));

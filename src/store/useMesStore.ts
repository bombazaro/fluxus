import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { LancamentoComDetalhes, RendaDoMes } from '@/src/types';
import { ResumoMes, resumoDoMes } from '@/src/domain/resumoDoMes';
import { rendasDoMes } from '@/src/domain/rendasDoMes';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { divisoesRepo } from '@/src/db/repositorios/divisoesRepo';
import { useConfigStore } from '@/src/store/useConfigStore';

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

/**
 * Lançamentos (com a parte do usuário nas contas divididas) e rendas de um mês.
 * Com gerar = false não cria os lançamentos das contas fixas: usado para ler o
 * mês anterior sem criar cobranças atrasadas lá.
 */
async function lerMes(
  db: SQLiteDatabase,
  mes: string,
  gerar: boolean
): Promise<{ lancamentos: LancamentoComDetalhes[]; rendas: RendaDoMes[] }> {
  if (gerar) {
    await lancamentosRepo.garantirMes(db, mes);
  }

  const lancamentos = await lancamentosRepo.listarPorMes(db, mes);

  // Lançamento dividido sem "Eu" entre as pessoas: minha parte é zero
  const divisoes = await divisoesRepo.listarPorMes(db, mes);
  const minhaPartePorLancamento = new Map<number, number>();
  for (const d of divisoes) {
    const atual = minhaPartePorLancamento.get(d.lancamento_id) ?? 0;
    const minhaParte = d.pessoa_nome === 'Eu' ? d.valor_centavos : 0;
    minhaPartePorLancamento.set(d.lancamento_id, atual + minhaParte);
  }
  for (const l of lancamentos) {
    if (l.compartilhada === 1 && minhaPartePorLancamento.has(l.id)) {
      l.minha_parte_centavos = minhaPartePorLancamento.get(l.id);
    }
  }

  // Rendas que valem no mês (com o valor recebido, se houver)
  const todasRendas = await rendasRepo.listarTodas(db);
  const recebidas = await rendasRepo.listarRecebidasDoMes(db, mes);
  const rendas = rendasDoMes(todasRendas, recebidas, mes);

  return { lancamentos, rendas };
}

function opcoesResumo() {
  return { considerarApenasMinhaParte: useConfigStore.getState().config.contarSoMinhaParte };
}

interface ItemDesfazer {
  id: number;
  pagoAnterior: number;
  timestamp: number;
}

export interface MesState {
  mesRef: string;
  lancamentos: LancamentoComDetalhes[];
  rendas: RendaDoMes[];
  resumo: ResumoMes;
  /** Mês anterior, para comparar gastos e levar a sobra. */
  lancamentosAnterior: LancamentoComDetalhes[];
  resumoAnterior: ResumoMes;
  /** Sobra do mês anterior que entra no saldo deste mês (0 se desligado ou negativa). */
  saldoInicial: number;
  carregando: boolean;
  erro: string | null;

  // Filtros
  filtroSituacao: FiltroSituacao;
  filtroCategoriaId: number | null;
  busca: string;
  /** Lista de contas com as maiores primeiro (o aviso de aperto liga isso). */
  ordenarPorValor: boolean;

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
  setOrdenarPorValor: (ordenar: boolean) => void;
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
  lancamentosAnterior: [],
  resumoAnterior: resumoInicial,
  saldoInicial: 0,
  carregando: false,
  erro: null,
  filtroSituacao: 'todas',
  filtroCategoriaId: null,
  busca: '',
  ordenarPorValor: false,
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
      const { lancamentos, rendas } = await lerMes(db, mes, true);
      const anterior = await lerMes(db, adicionarMeses(mes, -1), false);

      const resumo = resumoDoMes(lancamentos, rendas, opcoesResumo());
      const resumoAnterior = resumoDoMes(anterior.lancamentos, anterior.rendas, opcoesResumo());
      const saldoInicial = useConfigStore.getState().config.usarSobraDoMesAnterior
        ? Math.max(0, resumoAnterior.sobra)
        : 0;

      set({
        mesRef: mes,
        lancamentos,
        rendas,
        resumo,
        lancamentosAnterior: anterior.lancamentos,
        resumoAnterior,
        saldoInicial,
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
    const novoResumo = resumoDoMes(novosLancamentos, get().rendas, opcoesResumo());

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

    await get().marcarPago(db, desfazer.id, desfazer.pagoAnterior === 1);
    // marcarPago registra a ação como desfazível; desfazer o desfazer não faz sentido
    set({ ultimoDesfeito: null });
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
  setOrdenarPorValor: (ordenarPorValor) => set({ ordenarPorValor }),
}));

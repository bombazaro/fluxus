import { create } from 'zustand';
import { Rede } from '@/src/services/sync/rede';

export type SituacaoSync = 'desligada' | 'parada' | 'sincronizando' | 'erro';

interface ContaState {
  /** Ligação com o servidor. Nula enquanto a pessoa não entrou na conta. */
  rede: Rede | null;
  situacao: SituacaoSync;
  ultimaVez: string | null;
  erro: string | null;
  definirRede: (rede: Rede | null) => void;
  comecou: () => void;
  terminou: (erro: string | null) => void;
}

/** Estado da conta sincronizada. Quem sincroniza de fato é o componente Sincronizador. */
export const useContaStore = create<ContaState>((set) => ({
  rede: null,
  situacao: 'desligada',
  ultimaVez: null,
  erro: null,
  definirRede: (rede) =>
    set({ rede, situacao: rede ? 'parada' : 'desligada', erro: null, ultimaVez: null }),
  comecou: () => set({ situacao: 'sincronizando' }),
  terminou: (erro) =>
    set(
      erro === null
        ? { situacao: 'parada', erro: null, ultimaVez: new Date().toISOString() }
        : { situacao: 'erro', erro }
    ),
}));

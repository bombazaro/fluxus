import { create } from 'zustand';
import { Usuario } from '@/src/services/conta';
import { Rede } from '@/src/services/sync/rede';

export type SituacaoSync = 'desligada' | 'parada' | 'sincronizando' | 'erro';

interface ContaState {
  /** Ligação com o servidor. Nula enquanto a pessoa não entrou na conta. */
  rede: Rede | null;
  /** Quem está conectado (mesmo que este aparelho ainda não tenha sido ligado à conta). */
  usuario: Usuario | null;
  situacao: SituacaoSync;
  ultimaVez: string | null;
  erro: string | null;
  definirRede: (rede: Rede | null) => void;
  definirUsuario: (usuario: Usuario | null) => void;
  comecou: () => void;
  terminou: (erro: string | null) => void;
}

/** Estado da conta sincronizada. Quem sincroniza de fato é o componente Sincronizador. */
export const useContaStore = create<ContaState>((set) => ({
  rede: null,
  usuario: null,
  situacao: 'desligada',
  ultimaVez: null,
  erro: null,
  definirRede: (rede) =>
    set({ rede, situacao: rede ? 'parada' : 'desligada', erro: null, ultimaVez: null }),
  definirUsuario: (usuario) => set({ usuario }),
  comecou: () => set({ situacao: 'sincronizando' }),
  terminou: (erro) =>
    set(
      erro === null
        ? { situacao: 'parada', erro: null, ultimaVez: new Date().toISOString() }
        : { situacao: 'erro', erro }
    ),
}));

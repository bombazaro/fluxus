import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import { CONFIG_PADRAO, Configuracoes } from '@/src/domain/configuracoes';
import { configuracoesRepo } from '@/src/db/repositorios/configuracoesRepo';

interface ConfigState {
  config: Configuracoes;
  /** false até ler do banco: evita mostrar o onboarding por um instante. */
  carregada: boolean;
  carregar: (db: SQLiteDatabase) => Promise<void>;
  atualizar: (db: SQLiteDatabase, parcial: Partial<Configuracoes>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: CONFIG_PADRAO,
  carregada: false,

  carregar: async (db) => {
    const config = await configuracoesRepo.obter(db);
    // Quem já usava o app antes das boas-vindas existirem não precisa vê-las
    if (!config.onboardingConcluido && (await configuracoesRepo.temDados(db))) {
      config.onboardingConcluido = true;
      await configuracoesRepo.salvar(db, { onboardingConcluido: true });
    }
    set({ config, carregada: true });
  },

  atualizar: async (db, parcial) => {
    const anterior = get().config;
    set({ config: { ...anterior, ...parcial } });
    try {
      await configuracoesRepo.salvar(db, parcial);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      set({ config: anterior });
    }
  },
}));

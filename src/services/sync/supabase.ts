import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Registro, TabelaSync } from '@/src/domain/sync/registro';
import { Cursor, Rede, RegistroRecebido } from './rede';

interface Chamada {
  rpc(nome: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

interface LinhaDoServidor {
  tabela: TabelaSync;
  uid: string;
  dados: Record<string, string | number | null> | null;
  atualizado_em: string;
  excluido_em: string | null;
  recebido_em: string;
}

const FALHA = 'Não foi possível sincronizar agora. Verifique a conexão.';

/** Liga o motor às funções do servidor (`enviar_registros` e `buscar_registros`). */
export function criarRedeSupabase(cliente: Chamada): Rede {
  return {
    async enviar(lote: Registro[]) {
      const { data, error } = await cliente.rpc('enviar_registros', {
        lote: lote.map((r) => ({
          tabela: r.tabela,
          uid: r.uid,
          dados: r.dados,
          atualizado_em: r.atualizadoEm,
          excluido_em: r.excluidoEm,
        })),
      });
      if (error) throw new Error(FALHA);
      return String((data as { recebido_em: string }).recebido_em);
    },

    async buscar(cursor: Cursor | null, limite: number): Promise<RegistroRecebido[]> {
      const { data, error } = await cliente.rpc('buscar_registros', {
        desde: cursor?.recebidoEm ?? null,
        desde_tabela: cursor?.tabela ?? '',
        desde_uid: cursor?.uid ?? '',
        limite,
      });
      if (error) throw new Error(FALHA);
      return ((data ?? []) as LinhaDoServidor[]).map((l) => ({
        tabela: l.tabela,
        uid: l.uid,
        dados: l.dados,
        atualizadoEm: l.atualizado_em,
        excluidoEm: l.excluido_em,
        recebidoEm: l.recebido_em,
      }));
    },
  };
}

/** A conta só funciona se o app foi construído com o endereço e a chave pública do Supabase. */
export const contaDisponivel = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_KEY
);

let cliente: SupabaseClient | null = null;

/** Cliente do Supabase (um só no app), ou null se o app não foi configurado para a conta. */
export function obterClienteSupabase(): SupabaseClient | null {
  if (!contaDisponivel) return null;
  if (!cliente) {
    // No celular a sessão fica no armazenamento do app; na web, no localStorage do navegador.
    const armazenamento =
      Platform.OS === 'web' ? undefined : require('expo-sqlite/kv-store').default;
    cliente = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL as string,
      process.env.EXPO_PUBLIC_SUPABASE_KEY as string,
      {
        auth: {
          storage: armazenamento,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return cliente;
}

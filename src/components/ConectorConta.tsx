import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { usuarioAtual } from '@/src/services/conta';
import { criarRedeSupabase, obterClienteSupabase } from '@/src/services/sync/supabase';
import { useContaStore } from '@/src/store/useContaStore';

/**
 * Ao abrir o app, reconecta a conta se a pessoa já tinha entrado e este aparelho já foi
 * ligado a ela. Também acompanha a saída da conta e mantém a sessão renovada.
 */
export function ConectorConta() {
  const db = useSQLiteContext();

  useEffect(() => {
    const cliente = obterClienteSupabase();
    if (!cliente) return;
    let ativo = true;
    const conta = useContaStore.getState();

    const conectar = async () => {
      try {
        const usuario = await usuarioAtual(cliente.auth);
        if (!ativo) return;
        conta.definirUsuario(usuario);
        if (!usuario) return conta.definirRede(null);
        const ligado = await db.getFirstAsync<{ valor: string }>(
          "SELECT valor FROM sync_estado WHERE chave = 'usuario_id';"
        );
        // só sincroniza sozinho se este aparelho já foi ligado a esta conta
        if (ligado?.valor === usuario.id) conta.definirRede(criarRedeSupabase(cliente));
      } catch (err) {
        console.warn('Não foi possível reconectar a conta:', err);
      }
    };
    void conectar();

    const { data } = cliente.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        useContaStore.getState().definirUsuario(null);
        useContaStore.getState().definirRede(null);
      }
    });

    // no celular, a renovação da sessão só deve rodar com o app aberto
    const assinatura =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (estado) => {
            if (estado === 'active') cliente.auth.startAutoRefresh();
            else cliente.auth.stopAutoRefresh();
          });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
      assinatura?.remove();
    };
  }, [db]);

  return null;
}

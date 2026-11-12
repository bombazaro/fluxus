import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { usuarioAtual } from '@/src/services/conta';
import { ligarAparelhoVazio } from '@/src/services/sync/ligacao';
import { criarRedeSupabase, obterClienteSupabase } from '@/src/services/sync/supabase';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useContaStore } from '@/src/store/useContaStore';
import { useMesStore } from '@/src/store/useMesStore';

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
        if (ligado?.valor === usuario.id) return conta.definirRede(criarRedeSupabase(cliente));

        // Login salvo, mas o aparelho não está ligado e não tem dados próprios (o banco foi
        // apagado): liga sozinho para os dados voltarem. Na volta do Google quem liga é a tela de
        // conta, que avisa a pessoa; aqui fica de fora para não ligar duas vezes.
        const naTelaDeConta =
          Platform.OS === 'web' && window.location.pathname.startsWith('/conta-sincronizada');
        if (ligado || naTelaDeConta) return;
        const rede = criarRedeSupabase(cliente);
        if (!(await ligarAparelhoVazio(db, rede, usuario.id)) || !ativo) return;
        conta.definirRede(rede);
        await useConfigStore.getState().carregar(db);
        await useMesStore.getState().carregarMes(db);
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

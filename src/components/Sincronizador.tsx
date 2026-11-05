import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { criarAgendador } from '@/src/services/sync/agendador';
import { sincronizar } from '@/src/services/sync/motor';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useContaStore } from '@/src/store/useContaStore';
import { useMesStore } from '@/src/store/useMesStore';

/**
 * Mantém a conta sincronizada: ao abrir, ao voltar para o app, depois de cada mudança e a
 * cada minuto. Não desenha nada e não faz nada enquanto não houver conta conectada.
 */
export function Sincronizador() {
  const db = useSQLiteContext();
  const rede = useContaStore((s) => s.rede);

  useEffect(() => {
    if (!rede) return;
    const agendador = criarAgendador({
      rodar: async () => {
        const conta = useContaStore.getState();
        conta.comecou();
        try {
          const r = await sincronizar(db, rede);
          conta.terminou(null);
          if (r.aplicados > 0) {
            // o que veio de outro aparelho precisa aparecer nas telas abertas
            await useConfigStore.getState().carregar(db);
            await useMesStore.getState().carregarMes(db);
          }
        } catch (err) {
          console.warn('Sincronização falhou:', err);
          conta.terminou(err instanceof Error ? err.message : 'Falha ao sincronizar.');
          throw err;
        }
      },
      temPendencia: async () => {
        const l = await db.getFirstAsync<{ n: number }>(
          `SELECT (SELECT COUNT(*) FROM sync_pendencias) +
                  (SELECT COUNT(*) FROM sync_exclusoes) AS n;`
        );
        return (l?.n ?? 0) > 0;
      },
    });
    agendador.iniciar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void agendador.pedir();
    });
    return () => {
      assinatura.remove();
      agendador.parar();
    };
  }, [db, rede]);

  return null;
}

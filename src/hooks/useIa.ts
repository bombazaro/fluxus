import { useEffect, useState } from 'react';
import { obterClienteSupabase } from '@/src/services/sync/supabase';
import { ClienteFuncoes, sugerirCategoria } from '@/src/services/ia/cliente';
import { useContaStore } from '@/src/store/useContaStore';
import { obterHojeIso } from '@/src/store/useMesStore';
import { Categoria } from '@/src/types';

/** Espera a pessoa parar de digitar antes de pedir a sugestão. */
const ESPERA_MS = 700;

/** A IA só existe para quem está com a conta ligada e sincronizando neste aparelho. */
export function useIaDisponivel(): { disponivel: boolean; cliente: ClienteFuncoes | null } {
  const usuario = useContaStore((s) => s.usuario);
  const rede = useContaStore((s) => s.rede);
  const cliente = obterClienteSupabase();
  const disponivel = !!cliente && !!usuario && !!rede;
  return { disponivel, cliente: disponivel ? (cliente as unknown as ClienteFuncoes) : null };
}

/** Categoria sugerida para o nome digitado, ou null (sem IA, sem certeza ou ainda esperando). */
export function useSugestaoDeCategoria(nome: string, categorias: Categoria[]): number | null {
  const { cliente } = useIaDisponivel();
  // Guarda a resposta junto com o nome a que ela pertence: nome mudou, sugestão antiga some.
  const [resposta, setResposta] = useState<{ nome: string; id: number | null } | null>(null);

  useEffect(() => {
    if (!cliente || categorias.length === 0 || nome.trim().length < 3) return;
    let ativo = true;
    const espera = setTimeout(async () => {
      const id = await sugerirCategoria(cliente, nome, categorias, obterHojeIso());
      if (ativo) setResposta({ nome, id });
    }, ESPERA_MS);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [nome, cliente, categorias]);

  return resposta?.nome === nome ? resposta.id : null;
}

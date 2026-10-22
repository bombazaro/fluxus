import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { previsaoRepo } from '@/src/db/repositorios/previsaoRepo';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { DadosPrevisao, FimParcelamento, fimDosParcelamentos } from '@/src/domain/preverSaldo';
import { useConfigStore } from '@/src/store/useConfigStore';
import { obterMesAtualIso } from '@/src/store/useMesStore';

export const MESES_PREVISAO = 6;

/**
 * Dados da previsão dos próximos meses (6, ou quantos forem pedidos), a partir do
 * mês atual. Recarrega sempre que a tela volta a aparecer (ex.: depois de
 * cadastrar uma parcela).
 */
export function usePrevisao(quantidadeMeses = MESES_PREVISAO) {
  const db = useSQLiteContext();
  const mesesMedia = useConfigStore((s) => s.config.mesesMedia);
  const [dados, setDados] = useState<DadosPrevisao | null>(null);
  const [parcelamentos, setParcelamentos] = useState<FimParcelamento[]>([]);
  const [erro, setErro] = useState(false);

  const mesInicial = obterMesAtualIso();

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      (async () => {
        try {
          // O mês atual precisa estar gerado para não contar as fixas duas vezes
          await lancamentosRepo.garantirMes(db, mesInicial);
          const [novosDados, parcelas] = await Promise.all([
            previsaoRepo.carregar(db, mesInicial, quantidadeMeses, mesesMedia),
            previsaoRepo.ultimasParcelas(db),
          ]);
          if (!ativo) return;
          setDados(novosDados);
          setParcelamentos(fimDosParcelamentos(parcelas, mesInicial));
          setErro(false);
        } catch (err) {
          console.error('Erro ao carregar a previsão:', err);
          if (ativo) setErro(true);
        }
      })();
      return () => {
        ativo = false;
      };
    }, [db, mesInicial, mesesMedia, quantidadeMeses])
  );

  return { dados, parcelamentos, mesInicial, erro };
}

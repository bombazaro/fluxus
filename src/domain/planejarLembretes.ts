import { formatarDataCurta, formatarMoeda } from '../utils/formatadores';

export interface LancamentoParaLembrete {
  id: number;
  conta_id: number;
  conta_nome: string;
  vencimento: string;
  valor_centavos: number;
  sem_vencimento: number;
}

export interface Lembrete {
  /** Fixo por lançamento: reagendar substitui em vez de duplicar. */
  identificador: string;
  quando: Date;
  titulo: string;
  corpo: string;
  contaId: number;
}

/** O Android limita a quantidade de alarmes por app; os mais próximos bastam. */
export const LIMITE_LEMBRETES = 60;

function dataNoHorario(dataIso: string, hora: number, diasAntes = 0): Date {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  return new Date(ano, mes - 1, dia - diasAntes, hora, 0);
}

/**
 * Decide quais lembretes agendar para os lançamentos não pagos:
 * um N dias antes do vencimento (se N > 0) e outro no dia, no horário escolhido.
 * Conta sem vencimento ganha só um aviso, no último dia do mês.
 * Nada no passado; ordenado pelo horário e limitado aos mais próximos.
 */
export function planejarLembretes(
  lancamentos: LancamentoParaLembrete[],
  config: { notificacaoHora: number; notificacaoDiasAntes: number },
  agora: Date,
  limite = LIMITE_LEMBRETES
): Lembrete[] {
  const lembretes: Lembrete[] = [];

  for (const l of lancamentos) {
    const corpo = `${formatarMoeda(l.valor_centavos)} · vence em ${formatarDataCurta(l.vencimento)}`;
    const base = { contaId: l.conta_id, corpo };

    if (l.sem_vencimento === 1) {
      lembretes.push({
        ...base,
        identificador: `lancamento-${l.id}-dia`,
        quando: dataNoHorario(l.vencimento, config.notificacaoHora),
        titulo: `${l.conta_nome}: último dia do mês para pagar`,
      });
      continue;
    }

    const dias = config.notificacaoDiasAntes;
    if (dias > 0) {
      lembretes.push({
        ...base,
        identificador: `lancamento-${l.id}-antes`,
        quando: dataNoHorario(l.vencimento, config.notificacaoHora, dias),
        titulo:
          dias === 1 ? `${l.conta_nome} vence amanhã` : `${l.conta_nome} vence em ${dias} dias`,
      });
    }
    lembretes.push({
      ...base,
      identificador: `lancamento-${l.id}-dia`,
      quando: dataNoHorario(l.vencimento, config.notificacaoHora),
      titulo: `${l.conta_nome} vence hoje`,
    });
  }

  return lembretes
    .filter((l) => l.quando.getTime() > agora.getTime())
    .sort((a, b) => a.quando.getTime() - b.quando.getTime())
    .slice(0, limite);
}

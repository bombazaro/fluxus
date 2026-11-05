export interface OpcoesAgendador {
  /** Faz uma rodada de sincronização. */
  rodar: () => Promise<void>;
  /** Há alguma mudança local esperando para ser enviada? */
  temPendencia: () => Promise<boolean>;
  /** De quanto em quanto tempo olhar se há mudança local (padrão 3 s). */
  checagemMs?: number;
  /** De quanto em quanto tempo sincronizar mesmo sem mudança local (padrão 60 s). */
  completoMs?: number;
}

/**
 * Decide quando sincronizar: ao iniciar, quando algo mudou aqui, a cada minuto e quando
 * pedirem (por exemplo, ao voltar para o app). Só uma rodada por vez; se pedirem durante
 * uma rodada, faz outra logo depois.
 */
export function criarAgendador({
  rodar,
  temPendencia,
  checagemMs = 3000,
  completoMs = 60000,
}: OpcoesAgendador) {
  let ativo = false;
  let emAndamento = false;
  let denovo = false;
  let relogios: ReturnType<typeof setInterval>[] = [];
  let falhas = 0;
  let esperarAte = 0;

  async function pedir(): Promise<void> {
    if (!ativo) return;
    if (emAndamento) {
      denovo = true;
      return;
    }
    emAndamento = true;
    try {
      do {
        denovo = false;
        try {
          await rodar();
          falhas = 0;
        } catch {
          // quem usa mostra o erro; aqui só se espera mais a cada falha seguida (3 s, 6 s...
          // até 1 min) para não gastar bateria e rede quando está sem conexão
          falhas += 1;
          esperarAte = Date.now() + Math.min(checagemMs * 2 ** falhas, completoMs);
        }
      } while (denovo && ativo);
    } finally {
      emAndamento = false;
    }
  }

  return {
    iniciar() {
      if (ativo) return;
      ativo = true;
      relogios = [
        setInterval(() => {
          if (Date.now() < esperarAte) return;
          temPendencia()
            .then((p) => {
              if (p) void pedir();
            })
            .catch(() => {});
        }, checagemMs),
        setInterval(() => void pedir(), completoMs),
      ];
      void pedir();
    },
    parar() {
      ativo = false;
      relogios.forEach(clearInterval);
      relogios = [];
    },
    pedir,
  };
}

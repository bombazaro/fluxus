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
        } catch {
          // a próxima rodada tenta de novo; quem usa mostra o erro por conta própria
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

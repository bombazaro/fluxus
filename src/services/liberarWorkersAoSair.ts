interface JanelaComWorkers {
  Worker: typeof Worker;
  addEventListener: (tipo: string, fn: () => void) => void;
}

/**
 * Na web o banco fica num worker que segura o arquivo (OPFS) só para si. O Firefox demora a
 * soltar esse arquivo quando a página é fechada, recarregada ou vai para outro site (ex.: login
 * do Google), e a página nova fica sem conseguir abrir o banco ("No modification allowed").
 * Encerrar os workers explicitamente ao sair da página resolve.
 */
export function liberarWorkersAoSair(janela: JanelaComWorkers): void {
  const OriginalWorker = janela.Worker;
  if (!OriginalWorker) return;
  const criados: Worker[] = [];

  function WorkerRastreado(this: unknown, ...args: ConstructorParameters<typeof Worker>) {
    const w = new OriginalWorker(...args);
    criados.push(w);
    return w;
  }
  WorkerRastreado.prototype = OriginalWorker.prototype;
  janela.Worker = WorkerRastreado as unknown as typeof Worker;

  janela.addEventListener('pagehide', () => {
    criados.forEach((w) => w.terminate());
    criados.length = 0;
  });
}

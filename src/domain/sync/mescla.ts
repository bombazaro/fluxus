/** O que se sabe de uma versão de linha para decidir qual vale. */
export interface MetaLinha {
  /** Quando a pessoa mexeu na linha (texto de data e hora, em qualquer formato ISO). */
  atualizadoEm: string;
  /** Quando foi excluída; null se a linha existe. */
  excluidoEm: string | null;
  /** Resumo do conteúdo, para saber se duas versões com a mesma data são a mesma. */
  assinatura: string;
}

export type Decisao = 'aplicar-remoto' | 'manter-local' | 'ja-igual';

/** Hora em milissegundos; data inválida vira 0, a mais antiga possível. */
function instante(texto: string): number {
  const t = Date.parse(texto);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Decide entre a versão que está neste aparelho e a que veio do servidor.
 * A edição mais recente vence; uma exclusão é uma edição como as outras (a pessoa que
 * editou depois de a linha ser excluída "ressuscita" a linha). Com a mesma data e conteúdo
 * diferente, vale a cópia do servidor, para os aparelhos chegarem ao mesmo resultado.
 */
export function decidir(local: MetaLinha | null, remoto: MetaLinha): Decisao {
  if (local === null) return 'aplicar-remoto';
  const l = instante(local.atualizadoEm);
  const r = instante(remoto.atualizadoEm);
  if (r > l) return 'aplicar-remoto';
  if (r < l) return 'manter-local';
  return local.assinatura === remoto.assinatura ? 'ja-igual' : 'aplicar-remoto';
}

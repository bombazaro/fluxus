import { Registro } from '@/src/domain/sync/registro';

/** Registro como o servidor devolve: com a hora em que ele o recebeu. */
export interface RegistroRecebido extends Registro {
  recebidoEm: string;
}

/** Posição de leitura: a última linha já recebida, na ordem do servidor. */
export interface Cursor {
  recebidoEm: string;
  tabela: string;
  uid: string;
}

/** O que o motor precisa do servidor. A implementação real usa o Supabase; os testes, uma falsa. */
export interface Rede {
  /** Envia até 500 registros; devolve a hora do servidor. */
  enviar(lote: Registro[]): Promise<string>;
  /** Registros recebidos depois do cursor (todos, se nulo), em ordem estável. */
  buscar(cursor: Cursor | null, limite: number): Promise<RegistroRecebido[]>;
}

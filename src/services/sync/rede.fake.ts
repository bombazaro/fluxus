import { Registro } from '@/src/domain/sync/registro';
import { Cursor, Rede, RegistroRecebido } from './rede';

export interface OpcoesRedeFalsa {
  /** Hora do servidor (padrão: a hora real, sempre crescente). */
  agora?: () => Date;
  /** Chamada a cada lote enviado (começa em 1); lance um erro para simular queda da rede. */
  aoEnviar?: (numeroDoLote: number) => void;
}

/** Servidor em memória com as mesmas regras do supabase/schema.sql. */
export function criarRedeFalsa(opcoes: OpcoesRedeFalsa = {}) {
  // hora real, mas sempre crescente (duas chamadas no mesmo milissegundo não empatam)
  let ultimo = 0;
  const agora =
    opcoes.agora ??
    (() => {
      ultimo = Math.max(Date.now(), ultimo + 1);
      return new Date(ultimo);
    });
  const linhas = new Map<string, RegistroRecebido>();
  let lotes = 0;

  const rede: Rede = {
    async enviar(lote: Registro[]) {
      lotes += 1;
      opcoes.aoEnviar?.(lotes);
      const recebido = agora();
      for (const r of lote) {
        const chave = `${r.tabela}|${r.uid}`;
        const atual = linhas.get(chave);
        // relógio adiantado no aparelho não vale mais que o do servidor
        const versao = Math.min(Date.parse(r.atualizadoEm), recebido.getTime());
        if (atual && Date.parse(atual.atualizadoEm) >= versao) continue;
        linhas.set(chave, {
          ...r,
          atualizadoEm: new Date(versao).toISOString(),
          recebidoEm: recebido.toISOString(),
        });
      }
      return recebido.toISOString();
    },
    async buscar(cursor: Cursor | null, limite: number) {
      const depois = (r: RegistroRecebido) =>
        cursor === null ||
        r.recebidoEm > cursor.recebidoEm ||
        (r.recebidoEm === cursor.recebidoEm &&
          (r.tabela > cursor.tabela || (r.tabela === cursor.tabela && r.uid > cursor.uid)));
      return [...linhas.values()]
        .filter(depois)
        .sort(
          (a, b) =>
            a.recebidoEm.localeCompare(b.recebidoEm) ||
            a.tabela.localeCompare(b.tabela) ||
            a.uid.localeCompare(b.uid)
        )
        .slice(0, limite)
        .map((r) => structuredClone(r));
    },
  };

  return {
    rede,
    /** Linhas guardadas no servidor, para conferir nos testes. */
    linhas: () => [...linhas.values()],
  };
}

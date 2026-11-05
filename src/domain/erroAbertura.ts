export interface TextosErroAbertura {
  titulo: string;
  explicacao: string;
  /** Mensagem técnica para a pessoa anotar; null quando o aviso já basta. */
  detalhe: string | null;
}

/** Banco aberto em outra aba: o navegador só deixa uma por vez usar o arquivo. */
function bancoPresoPorOutraAba(erro: Error): boolean {
  // Chrome cita o método na mensagem; Firefox e Safari usam o nome do erro
  return (
    erro.name === 'NoModificationAllowedError' ||
    (erro.message ?? '').includes('createSyncAccessHandle')
  );
}

/** Textos da tela mostrada quando o app não consegue abrir os dados. */
export function textosDoErroDeAbertura(erro: Error, web: boolean): TextosErroAbertura {
  if (web && bancoPresoPorOutraAba(erro)) {
    return {
      titulo: 'O Fluxus já está aberto em outra aba.',
      explicacao: 'Feche a outra aba do Fluxus e toque em Tentar de novo.',
      detalhe: null,
    };
  }
  return {
    titulo: 'Ops! Não foi possível abrir seus dados.',
    explicacao: web
      ? 'Seus dados continuam guardados neste navegador. Recarregue a página. Se o problema continuar, anote a mensagem abaixo.'
      : 'Seus dados continuam guardados no celular. Feche o app e abra de novo. Se o problema continuar, anote a mensagem abaixo.',
    detalhe: erro.message ?? '',
  };
}

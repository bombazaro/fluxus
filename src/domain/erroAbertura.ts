export interface TextosErroAbertura {
  titulo: string;
  explicacao: string;
  /** Mensagem técnica para a pessoa anotar; null quando o aviso já basta. */
  detalhe: string | null;
}

/** Banco aberto em outra aba: o navegador só deixa uma por vez usar o arquivo. */
export function bancoPresoPorOutraAba(erro: Error): boolean {
  // O erro cruza o worker e perde o nome: Chrome deixa o método na mensagem,
  // Firefox deixa só "No modification allowed"
  const mensagem = erro.message ?? '';
  return (
    erro.name === 'NoModificationAllowedError' ||
    mensagem.includes('createSyncAccessHandle') ||
    mensagem.includes('No modification allowed') ||
    // O worker falhou ao pegar o arquivo uma vez e não tenta de novo
    mensagem.includes('Invalid VFS state')
  );
}

/**
 * O navegador nega o armazenamento de arquivos (OPFS), onde o banco mora. Acontece em janela
 * privada do Firefox ("Security error when calling GetDirectory") e em navegadores que o bloqueiam.
 */
export function bancoBloqueadoEmJanelaPrivada(erro: Error): boolean {
  const mensagem = erro.message ?? '';
  return (
    erro.name === 'SecurityError' ||
    mensagem.includes('GetDirectory') ||
    mensagem.includes('Security error')
  );
}

/** Textos da tela mostrada quando o app não consegue abrir os dados. */
export function textosDoErroDeAbertura(erro: Error, web: boolean): TextosErroAbertura {
  if (web && bancoBloqueadoEmJanelaPrivada(erro)) {
    return {
      titulo: 'Este navegador não deixa guardar dados aqui.',
      explicacao:
        'Isso costuma acontecer em janela privada (anônima). Abra o Fluxus numa janela normal para usar o app.',
      detalhe: null,
    };
  }
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

const CHAVE_TENTATIVAS = 'fluxus:tentativas-banco';
const MAXIMO_TENTATIVAS = 6;

/**
 * Conta mais uma recarga automática da página; false quando já recarregou vezes demais
 * (aí a pessoa vê a tela de erro e decide). O contador dura só enquanto a aba existe.
 */
export function recarregarParaReabrirBanco(): boolean {
  try {
    const feitas = Number(sessionStorage.getItem(CHAVE_TENTATIVAS) ?? '0');
    if (feitas >= MAXIMO_TENTATIVAS) return false;
    sessionStorage.setItem(CHAVE_TENTATIVAS, String(feitas + 1));
    return true;
  } catch {
    return false;
  }
}

/** Banco abriu: zera o contador de recargas. */
export function bancoReabriuComSucesso(): void {
  try {
    sessionStorage.removeItem(CHAVE_TENTATIVAS);
  } catch {
    // sem sessionStorage: nada a limpar
  }
}

/** Versão para o navegador: baixa o arquivo e abre o seletor de arquivos da página. */

/** Baixa um arquivo de texto para a pasta de downloads. */
export async function entregarArquivo(nome: string, conteudo: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libera o endereço só depois: o Safari baixa um arquivo vazio se ele sumir logo
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Abre o seletor de arquivos e devolve o texto do escolhido, ou null se cancelar. */
export function escolherArquivoTexto(): Promise<string | null> {
  return new Promise((resolve) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json,application/json,text/plain';
    entrada.onchange = async () => {
      try {
        const arquivo = entrada.files?.[0];
        resolve(arquivo ? await arquivo.text() : null);
      } catch {
        // arquivo apagado ou sem permissão: trata como se tivesse cancelado
        resolve(null);
      }
    };
    entrada.oncancel = () => resolve(null);
    entrada.click();
  });
}

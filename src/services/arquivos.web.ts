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
  URL.revokeObjectURL(url);
}

/** Abre o seletor de arquivos e devolve o texto do escolhido, ou null se cancelar. */
export function escolherArquivoTexto(): Promise<string | null> {
  return new Promise((resolve) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json,application/json,text/plain';
    entrada.onchange = async () => {
      const arquivo = entrada.files?.[0];
      resolve(arquivo ? await arquivo.text() : null);
    };
    entrada.oncancel = () => resolve(null);
    entrada.click();
  });
}

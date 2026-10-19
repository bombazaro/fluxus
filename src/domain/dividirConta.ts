/**
 * Divide um valor total em centavos igualmente entre N pessoas.
 * Se houver sobra de centavos indivisíveis, distribui os centavos restantes
 * entre as primeiras pessoas para que a soma seja EXATAMENTE igual ao total.
 * Ex: 1000 centavos / 3 pessoas -> [334, 333, 333] (soma = 1000).
 */
export function dividirContaPorIgual(
  totalCentavos: number,
  qtdPessoas: number
): number[] {
  if (qtdPessoas <= 0) return [];
  if (qtdPessoas === 1) return [totalCentavos];

  const parteBase = Math.floor(totalCentavos / qtdPessoas);
  let resto = totalCentavos % qtdPessoas;

  const resultado: number[] = [];
  for (let i = 0; i < qtdPessoas; i++) {
    let valorPessoa = parteBase;
    if (resto > 0) {
      valorPessoa += 1;
      resto -= 1;
    }
    resultado.push(valorPessoa);
  }

  return resultado;
}

/**
 * Divide um valor total em centavos de acordo com as porcentagens informadas.
 * Ajusta o arredondamento na última pessoa para garantir que a soma feche 100%.
 */
export function dividirContaPorPorcentagem(
  totalCentavos: number,
  porcentagens: number[]
): number[] {
  if (porcentagens.length === 0) return [];

  let somaCalculada = 0;
  const resultado: number[] = [];

  for (let i = 0; i < porcentagens.length; i++) {
    if (i === porcentagens.length - 1) {
      // Último participante recebe a diferença para fechar o centavo exato
      resultado.push(totalCentavos - somaCalculada);
    } else {
      const valor = Math.round((totalCentavos * porcentagens[i]) / 100);
      resultado.push(valor);
      somaCalculada += valor;
    }
  }

  return resultado;
}

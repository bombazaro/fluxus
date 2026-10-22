import { formatarMoeda } from '../utils/formatadores';

/**
 * Divide um valor total em centavos igualmente entre N pessoas.
 * Se houver sobra de centavos indivisíveis, distribui os centavos restantes
 * entre as primeiras pessoas para que a soma seja EXATAMENTE igual ao total.
 * Ex: 1000 centavos / 3 pessoas -> [334, 333, 333] (soma = 1000).
 */
export function dividirContaPorIgual(totalCentavos: number, qtdPessoas: number): number[] {
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

/**
 * Repete uma divisão já existente para um novo valor total, mantendo a proporção
 * de cada pessoa. A última pessoa recebe a diferença para a soma fechar o total.
 * Ex: [6000, 4000] (60/40) com novo total 15000 -> [9000, 6000].
 */
export function redistribuirDivisao(
  valoresAnteriores: number[],
  novoTotalCentavos: number
): number[] {
  if (valoresAnteriores.length === 0) return [];

  const totalAnterior = valoresAnteriores.reduce((acc, v) => acc + v, 0);
  if (totalAnterior <= 0) {
    return dividirContaPorIgual(novoTotalCentavos, valoresAnteriores.length);
  }

  const porcentagens = valoresAnteriores.map((v) => (v * 100) / totalAnterior);
  return dividirContaPorPorcentagem(novoTotalCentavos, porcentagens);
}

export type ModoDivisao = 'igual' | 'porcentagem' | 'valor';

/**
 * Monta a divisão do formulário: quanto cabe a cada pessoa (na ordem de pessoaIds)
 * ou o erro a mostrar. Em 'porcentagem' as entradas são % (aceita decimais) e
 * precisam somar 100; em 'valor' são centavos e precisam somar o total.
 */
export function montarDivisao(
  totalCentavos: number,
  pessoaIds: number[],
  modo: ModoDivisao,
  entradas: Record<number, number>
): { valores: number[] | null; erro: string | null } {
  if (pessoaIds.length === 0) return { valores: null, erro: 'Escolha com quem dividir.' };

  if (modo === 'igual') {
    return { valores: dividirContaPorIgual(totalCentavos, pessoaIds.length), erro: null };
  }

  const informados = pessoaIds.map((id) => entradas[id] ?? 0);
  const soma = informados.reduce((acc, v) => acc + v, 0);

  if (modo === 'porcentagem') {
    if (Math.abs(soma - 100) > 0.001) {
      const somaTexto = String(Math.round(soma * 100) / 100).replace('.', ',');
      return { valores: null, erro: `As porcentagens somam ${somaTexto}%. Precisam fechar 100%.` };
    }
    return { valores: dividirContaPorPorcentagem(totalCentavos, informados), erro: null };
  }

  if (soma < totalCentavos) {
    return {
      valores: null,
      erro: `Faltam ${formatarMoeda(totalCentavos - soma)} para fechar o valor da conta.`,
    };
  }
  if (soma > totalCentavos) {
    return {
      valores: null,
      erro: `A divisão passa ${formatarMoeda(soma - totalCentavos)} do valor da conta.`,
    };
  }
  return { valores: informados, erro: null };
}

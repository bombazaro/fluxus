export interface EntradaRendaInicial {
  nome: string;
  valorCentavos: number;
  diaTexto: string;
}

export interface ResultadoRendaInicial {
  /** null quando a pessoa deixou em branco (vai cadastrar depois) ou há erro. */
  renda: { nome: string; valor_centavos: number; dia_recebimento: number } | null;
  erro: string | null;
}

/**
 * Valida a renda respondida nas boas-vindas. Tudo em branco é válido: a pessoa
 * pode cadastrar depois. Sem nome, a renda se chama "Salário".
 */
export function validarRendaInicial({
  nome,
  valorCentavos,
  diaTexto,
}: EntradaRendaInicial): ResultadoRendaInicial {
  const dia = diaTexto.trim();
  if (valorCentavos <= 0 && dia === '') return { renda: null, erro: null };
  if (valorCentavos <= 0) return { renda: null, erro: 'Informe quanto você recebe' };

  const diaNum = Number(dia);
  if (dia === '' || !Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) {
    return { renda: null, erro: 'Informe o dia em que o dinheiro cai (1 a 31)' };
  }

  return {
    renda: {
      nome: nome.trim() || 'Salário',
      valor_centavos: valorCentavos,
      dia_recebimento: diaNum,
    },
    erro: null,
  };
}

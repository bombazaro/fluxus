/**
 * Saudação da tela Início conforme a hora: "Bom dia, Ana!" de 5h ao meio-dia,
 * "Boa tarde" até 18h e "Boa noite" no resto. Sem nome, só a saudação.
 */
export function saudacao(hora: number, nome: string): string {
  const periodo =
    hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = nome.trim().split(/\s+/)[0];
  return primeiroNome ? `${periodo}, ${primeiroNome}!` : `${periodo}!`;
}

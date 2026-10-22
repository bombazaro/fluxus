import { validarRendaInicial } from '../src/domain/rendaInicial';

describe('validarRendaInicial', () => {
  it('monta a renda fixa com nome, valor e dia', () => {
    expect(
      validarRendaInicial({ nome: ' Salário ', valorCentavos: 350000, diaTexto: '5' })
    ).toEqual({
      renda: { nome: 'Salário', valor_centavos: 350000, dia_recebimento: 5 },
      erro: null,
    });
  });

  it('sem nome, chama de Salário', () => {
    const { renda } = validarRendaInicial({ nome: '  ', valorCentavos: 100000, diaTexto: '30' });
    expect(renda?.nome).toBe('Salário');
  });

  it('tudo em branco: a pessoa preferiu cadastrar depois', () => {
    expect(validarRendaInicial({ nome: 'Salário', valorCentavos: 0, diaTexto: '' })).toEqual({
      renda: null,
      erro: null,
    });
  });

  it('pede o valor quando só o dia foi preenchido', () => {
    const { renda, erro } = validarRendaInicial({ nome: '', valorCentavos: 0, diaTexto: '10' });
    expect(renda).toBeNull();
    expect(erro).toBe('Informe quanto você recebe');
  });

  it('pede um dia de 1 a 31', () => {
    for (const diaTexto of ['', '0', '32', 'abc']) {
      const { renda, erro } = validarRendaInicial({ nome: '', valorCentavos: 100000, diaTexto });
      expect(renda).toBeNull();
      expect(erro).toBe('Informe o dia em que o dinheiro cai (1 a 31)');
    }
  });
});

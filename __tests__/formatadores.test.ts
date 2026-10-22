import {
  dataBrParaIso,
  ehDataIsoValida,
  formatarData,
  formatarMoedaCurta,
  mascararData,
} from '../src/utils/formatadores';

describe('ehDataIsoValida', () => {
  it('aceita datas reais no formato AAAA-MM-DD', () => {
    expect(ehDataIsoValida('2026-05-15')).toBe(true);
    expect(ehDataIsoValida('2028-02-29')).toBe(true);
  });

  it('recusa datas que não existem', () => {
    expect(ehDataIsoValida('2026-02-30')).toBe(false);
    expect(ehDataIsoValida('2026-13-01')).toBe(false);
  });

  it('recusa outros formatos', () => {
    expect(ehDataIsoValida('15/05/2026')).toBe(false);
    expect(ehDataIsoValida('2026-5-15')).toBe(false);
    expect(ehDataIsoValida('')).toBe(false);
  });
});

describe('formatarData', () => {
  it('formata AAAA-MM-DD como DD/MM/AAAA', () => {
    expect(formatarData('2026-05-15')).toBe('15/05/2026');
  });
});

describe('formatarMoedaCurta', () => {
  it('mostra reais inteiros abaixo de mil', () => {
    expect(formatarMoedaCurta(45050)).toBe('R$ 451');
    expect(formatarMoedaCurta(0)).toBe('R$ 0');
  });

  it('abrevia milhares com uma casa até 10 mil', () => {
    expect(formatarMoedaCurta(290000)).toBe('R$ 2,9 mil');
    expect(formatarMoedaCurta(300000)).toBe('R$ 3 mil');
    expect(formatarMoedaCurta(1500000)).toBe('R$ 15 mil');
  });

  it('mostra o sinal de negativo', () => {
    expect(formatarMoedaCurta(-120000)).toBe('−R$ 1,2 mil');
  });
});

describe('mascararData', () => {
  it('coloca as barras enquanto digita', () => {
    expect(mascararData('2')).toBe('2');
    expect(mascararData('221')).toBe('22/1');
    expect(mascararData('2210')).toBe('22/10');
    expect(mascararData('22102026')).toBe('22/10/2026');
  });

  it('ignora o que não é número e o excesso', () => {
    expect(mascararData('22/10/2026')).toBe('22/10/2026');
    expect(mascararData('22-10-20269')).toBe('22/10/2026');
  });
});

describe('dataBrParaIso', () => {
  it('converte DD/MM/AAAA para AAAA-MM-DD', () => {
    expect(dataBrParaIso('22/10/2026')).toBe('2026-10-22');
    expect(dataBrParaIso('01/02/2027')).toBe('2027-02-01');
  });

  it('recusa data incompleta ou que não existe', () => {
    expect(dataBrParaIso('22/10')).toBeNull();
    expect(dataBrParaIso('30/02/2026')).toBeNull();
    expect(dataBrParaIso('2026-10-22')).toBeNull();
  });
});

import { ehDataIsoValida, formatarData } from '../src/utils/formatadores';

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

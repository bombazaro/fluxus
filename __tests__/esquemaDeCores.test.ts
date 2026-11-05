import { esquemaDeCores } from '@/src/domain/esquemaDeCores';

describe('esquemaDeCores', () => {
  it('"sistema" segue o sistema', () => {
    expect(esquemaDeCores('sistema', 'dark')).toBe('dark');
    expect(esquemaDeCores('sistema', 'light')).toBe('light');
  });

  it('sem informação do sistema usa o claro', () => {
    expect(esquemaDeCores('sistema', null)).toBe('light');
    expect(esquemaDeCores('sistema', undefined)).toBe('light');
  });

  it('"claro" e "escuro" ganham do sistema', () => {
    expect(esquemaDeCores('claro', 'dark')).toBe('light');
    expect(esquemaDeCores('escuro', 'light')).toBe('dark');
  });
});

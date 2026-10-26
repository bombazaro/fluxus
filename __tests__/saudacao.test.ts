import { saudacao } from '../src/domain/saudacao';

describe('saudacao', () => {
  it('muda conforme a hora do dia', () => {
    expect(saudacao(5, 'Ana')).toBe('Bom dia, Ana!');
    expect(saudacao(11, 'Ana')).toBe('Bom dia, Ana!');
    expect(saudacao(12, 'Ana')).toBe('Boa tarde, Ana!');
    expect(saudacao(17, 'Ana')).toBe('Boa tarde, Ana!');
    expect(saudacao(18, 'Ana')).toBe('Boa noite, Ana!');
    expect(saudacao(2, 'Ana')).toBe('Boa noite, Ana!');
  });

  it('usa só o primeiro nome', () => {
    expect(saudacao(9, '  Ana Maria Souza ')).toBe('Bom dia, Ana!');
  });

  it('sem nome, só a saudação', () => {
    expect(saudacao(9, '')).toBe('Bom dia!');
    expect(saudacao(20, '   ')).toBe('Boa noite!');
  });
});

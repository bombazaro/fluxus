import { classificarSituacao } from '../src/domain/classificarSituacao';

describe('classificarSituacao', () => {
  it('classifica como paga quando pago === 1', () => {
    expect(classificarSituacao('2026-05-01', 1, '2026-05-10')).toBe('paga');
    expect(classificarSituacao('2026-05-20', 1, '2026-05-10')).toBe('paga');
  });

  it('classifica como atrasada quando vencimento é anterior a hoje e não está paga', () => {
    expect(classificarSituacao('2026-05-09', 0, '2026-05-10')).toBe('atrasada');
    expect(classificarSituacao('2026-04-30', 0, '2026-05-10')).toBe('atrasada');
  });

  it('classifica como esta_semana quando vence hoje ou nos próximos 7 dias', () => {
    expect(classificarSituacao('2026-05-10', 0, '2026-05-10')).toBe('esta_semana');
    expect(classificarSituacao('2026-05-15', 0, '2026-05-10')).toBe('esta_semana');
    expect(classificarSituacao('2026-05-17', 0, '2026-05-10')).toBe('esta_semana');
  });

  it('classifica como mais_adiante quando vence após 7 dias', () => {
    expect(classificarSituacao('2026-05-18', 0, '2026-05-10')).toBe('mais_adiante');
    expect(classificarSituacao('2026-05-31', 0, '2026-05-10')).toBe('mais_adiante');
  });
});

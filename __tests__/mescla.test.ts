import { decidir, MetaLinha } from '../src/domain/sync/mescla';

const meta = (atualizadoEm: string, extra: Partial<MetaLinha> = {}): MetaLinha => ({
  atualizadoEm,
  excluidoEm: null,
  assinatura: 'a',
  ...extra,
});

describe('decidir (qual versão da linha vale)', () => {
  it('sem linha local, aplica a remota', () => {
    expect(decidir(null, meta('2026-11-01T10:00:00.000Z'))).toBe('aplicar-remoto');
  });

  it('remota mais nova vence, mesmo com a local ainda pendente', () => {
    const local = meta('2026-11-01T10:00:00.000Z', { assinatura: 'local' });
    expect(decidir(local, meta('2026-11-02T10:00:00.000Z', { assinatura: 'remota' }))).toBe(
      'aplicar-remoto'
    );
  });

  it('local mais nova vence', () => {
    const local = meta('2026-11-03T10:00:00.000Z', { assinatura: 'local' });
    expect(decidir(local, meta('2026-11-02T10:00:00.000Z', { assinatura: 'remota' }))).toBe(
      'manter-local'
    );
  });

  it('mesma data e mesmo conteúdo já está igual', () => {
    expect(decidir(meta('2026-11-01T10:00:00.000Z'), meta('2026-11-01T10:00:00.000Z'))).toBe(
      'ja-igual'
    );
  });

  it('mesma data e conteúdo diferente: a cópia do servidor é a que vale nos dois aparelhos', () => {
    const local = meta('2026-11-01T10:00:00.000Z', { assinatura: 'x' });
    expect(decidir(local, meta('2026-11-01T10:00:00.000Z', { assinatura: 'y' }))).toBe(
      'aplicar-remoto'
    );
  });

  it('compara a hora de verdade, não o texto (formatos diferentes do mesmo instante)', () => {
    const local = meta('2026-11-01T10:00:00.000Z');
    expect(decidir(local, meta('2026-11-01T10:00:00+00:00'))).toBe('ja-igual');
    expect(decidir(local, meta('2026-11-01T07:00:00.001-03:00'))).toBe('aplicar-remoto');
  });

  it('exclusão remota depois da edição local apaga; edição local depois da exclusão mantém', () => {
    const editadaCedo = meta('2026-11-01T10:00:00.000Z', { assinatura: 'local' });
    const exclusao = meta('2026-11-02T10:00:00.000Z', {
      excluidoEm: '2026-11-02T10:00:00.000Z',
      assinatura: 'excluida',
    });
    expect(decidir(editadaCedo, exclusao)).toBe('aplicar-remoto');

    const editadaTarde = meta('2026-11-03T10:00:00.000Z', { assinatura: 'local' });
    expect(decidir(editadaTarde, exclusao)).toBe('manter-local');
  });

  it('data inválida conta como a mais antiga possível', () => {
    expect(decidir(meta('lixo'), meta('2026-11-01T10:00:00.000Z'))).toBe('aplicar-remoto');
    expect(decidir(meta('2026-11-01T10:00:00.000Z'), meta('lixo'))).toBe('manter-local');
  });
});

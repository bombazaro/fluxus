import { textosDoErroDeAbertura } from '@/src/domain/erroAbertura';

const erroDeAba = new Error(
  "Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle': Access Handles cannot be created if there is another open Access Handle"
);

describe('textosDoErroDeAbertura', () => {
  it('na web, banco preso por outra aba vira um aviso claro', () => {
    const t = textosDoErroDeAbertura(erroDeAba, true);
    expect(t.titulo).toBe('O Fluxus já está aberto em outra aba.');
    expect(t.explicacao).toContain('Feche a outra aba');
    expect(t.detalhe).toBeNull();
  });

  it('na web, outro erro fala em navegador e mostra o detalhe', () => {
    const t = textosDoErroDeAbertura(new Error('boom'), true);
    expect(t.titulo).toBe('Ops! Não foi possível abrir seus dados.');
    expect(t.explicacao).toContain('neste navegador');
    expect(t.detalhe).toBe('boom');
  });

  it('no celular mantém o texto de sempre', () => {
    const t = textosDoErroDeAbertura(erroDeAba, false);
    expect(t.titulo).toBe('Ops! Não foi possível abrir seus dados.');
    expect(t.explicacao).toContain('guardados no celular');
    expect(t.detalhe).toBe(erroDeAba.message);
  });

  it('reconhece o erro de aba duplicada de outros navegadores pelo nome', () => {
    const erro = Object.assign(new Error('Unable to access file'), {
      name: 'NoModificationAllowedError',
    });
    expect(textosDoErroDeAbertura(erro, true).titulo).toBe('O Fluxus já está aberto em outra aba.');
  });

  it('não quebra quando o erro não tem mensagem', () => {
    const t = textosDoErroDeAbertura({} as Error, true);
    expect(t.titulo).toBe('Ops! Não foi possível abrir seus dados.');
    expect(t.detalhe).toBe('');
  });
});

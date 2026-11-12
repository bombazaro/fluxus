import {
  bancoBloqueadoEmJanelaPrivada,
  bancoPresoPorOutraAba,
  textosDoErroDeAbertura,
} from '@/src/domain/erroAbertura';

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

  it('reconhece o estado inválido que o worker deixa depois da primeira falha', () => {
    expect(textosDoErroDeAbertura(new Error('Invalid VFS state'), true).titulo).toBe(
      'O Fluxus já está aberto em outra aba.'
    );
  });

  it('reconhece o erro do Firefox, que chega do worker só com a mensagem', () => {
    const erro = new Error('No modification allowed');
    expect(textosDoErroDeAbertura(erro, true).titulo).toBe('O Fluxus já está aberto em outra aba.');
  });

  it('na web, o bloqueio do armazenamento em janela privada vira um aviso claro', () => {
    const erro = new Error('Security error when calling GetDirectory');
    const t = textosDoErroDeAbertura(erro, true);
    expect(t.titulo).toBe('Este navegador não deixa guardar dados aqui.');
    expect(t.explicacao).toContain('janela privada');
    expect(t.explicacao).toContain('janela normal');
    expect(t.detalhe).toBeNull();
  });

  it('reconhece o bloqueio pelo nome do erro e não o confunde com aba duplicada', () => {
    const erro = Object.assign(new Error('The operation is insecure.'), { name: 'SecurityError' });
    expect(bancoBloqueadoEmJanelaPrivada(erro)).toBe(true);
    expect(bancoPresoPorOutraAba(erro)).toBe(false);
    expect(bancoBloqueadoEmJanelaPrivada(erroDeAba)).toBe(false);
  });

  it('no celular o erro de segurança segue com o texto de sempre', () => {
    const erro = new Error('Security error when calling GetDirectory');
    expect(textosDoErroDeAbertura(erro, false).titulo).toBe('Ops! Não foi possível abrir seus dados.');
  });

  it('não quebra quando o erro não tem mensagem', () => {
    const t = textosDoErroDeAbertura({} as Error, true);
    expect(t.titulo).toBe('Ops! Não foi possível abrir seus dados.');
    expect(t.detalhe).toBe('');
  });
});

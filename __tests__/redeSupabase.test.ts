import { criarRedeSupabase } from '../src/services/sync/supabase';

const ok = (data: unknown) => Promise.resolve({ data, error: null });

describe('criarRedeSupabase', () => {
  it('enviar manda o lote no formato do servidor e devolve a hora dele', async () => {
    const rpc = jest
      .fn()
      .mockReturnValue(ok({ recebido_em: '2026-11-05T10:00:00+00:00', aplicados: 1 }));
    const rede = criarRedeSupabase({ rpc });
    const hora = await rede.enviar([
      { tabela: 'contas', uid: 'c1', dados: { nome: 'Luz' }, atualizadoEm: 'A', excluidoEm: null },
      { tabela: 'contas', uid: 'c2', dados: null, atualizadoEm: 'B', excluidoEm: 'B' },
    ]);
    expect(rpc).toHaveBeenCalledWith('enviar_registros', {
      lote: [
        {
          tabela: 'contas',
          uid: 'c1',
          dados: { nome: 'Luz' },
          atualizado_em: 'A',
          excluido_em: null,
        },
        { tabela: 'contas', uid: 'c2', dados: null, atualizado_em: 'B', excluido_em: 'B' },
      ],
    });
    expect(hora).toBe('2026-11-05T10:00:00+00:00');
  });

  it('buscar converte as linhas e manda o cursor', async () => {
    const rpc = jest.fn().mockReturnValue(
      ok([
        {
          tabela: 'pessoas',
          uid: 'p1',
          dados: { nome: 'Eu' },
          atualizado_em: '2026-11-05T10:00:00.123456+00:00',
          excluido_em: null,
          recebido_em: '2026-11-05T10:00:01.5+00:00',
        },
      ])
    );
    const rede = criarRedeSupabase({ rpc });
    const r = await rede.buscar({ recebidoEm: 'T', tabela: 'contas', uid: 'x' }, 500);
    expect(rpc).toHaveBeenCalledWith('buscar_registros', {
      desde: 'T',
      desde_tabela: 'contas',
      desde_uid: 'x',
      limite: 500,
    });
    expect(r).toEqual([
      {
        tabela: 'pessoas',
        uid: 'p1',
        dados: { nome: 'Eu' },
        atualizadoEm: '2026-11-05T10:00:00.123456+00:00',
        excluidoEm: null,
        recebidoEm: '2026-11-05T10:00:01.5+00:00',
      },
    ]);
  });

  it('sem cursor busca desde o começo', async () => {
    const rpc = jest.fn().mockReturnValue(ok([]));
    await criarRedeSupabase({ rpc }).buscar(null, 10);
    expect(rpc).toHaveBeenCalledWith('buscar_registros', {
      desde: null,
      desde_tabela: '',
      desde_uid: '',
      limite: 10,
    });
  });

  it('erro do servidor vira exceção com mensagem em português', async () => {
    const rpc = jest.fn().mockReturnValue(Promise.resolve({ data: null, error: { message: 'x' } }));
    await expect(criarRedeSupabase({ rpc }).enviar([])).rejects.toThrow(/sincronizar/i);
  });
});

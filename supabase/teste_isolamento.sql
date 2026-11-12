-- Teste de segurança e de regras do servidor. Cole no SQL Editor do Supabase e clique em Run.
--
-- Cria dois usuários de mentira (A e B), faz chamadas como cada um e confere o resultado.
-- Tudo é desfeito no fim: o teste termina de propósito com uma "mensagem de erro" que
-- começa com "OK:" quando passou (é isso que faz o Postgres desfazer tudo). Qualquer outra
-- mensagem mostra qual verificação falhou.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  r jsonb;
  n integer;
  ts timestamptz;
  ultimo record;
begin
  insert into auth.users (id, aud, role, email)
  values (a, 'authenticated', 'authenticated', 'a-' || a || '@teste.local'),
         (b, 'authenticated', 'authenticated', 'b-' || b || '@teste.local');

  -- ===== como A =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"c1","dados":{"nome":"Aluguel"},"atualizado_em":"2026-11-01T10:00:00Z"}]'::jsonb);
  if (r ->> 'aplicados')::int <> 1 then raise exception 'FALHOU: A deveria gravar 1 linha'; end if;

  -- uma versão mais antiga não vence
  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"c1","dados":{"nome":"Velho"},"atualizado_em":"2026-10-01T10:00:00Z"}]'::jsonb);
  if (r ->> 'aplicados')::int <> 0 then raise exception 'FALHOU: versão antiga não podia vencer'; end if;

  -- uma versão mais nova vence
  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"c1","dados":{"nome":"Novo"},"atualizado_em":"2026-11-02T10:00:00Z"}]'::jsonb);
  if (r ->> 'aplicados')::int <> 1 then raise exception 'FALHOU: versão nova deveria vencer'; end if;
  select count(*) into n from public.buscar_registros() where dados ->> 'nome' = 'Novo';
  if n <> 1 then raise exception 'FALHOU: A deveria ver a versão nova'; end if;

  -- relógio adiantado do aparelho é limitado à hora do servidor
  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"futuro","dados":{"nome":"X"},"atualizado_em":"2999-01-01T00:00:00Z"}]'::jsonb);
  select atualizado_em into ts from public.registros where uid = 'futuro';
  if ts > now() then raise exception 'FALHOU: data no futuro não foi limitada'; end if;

  -- exclusão: linha sem dados e com excluido_em, mais nova que a edição
  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"c1","dados":null,"atualizado_em":"2026-11-03T10:00:00Z","excluido_em":"2026-11-03T10:00:00Z"}]'::jsonb);
  select count(*) into n from public.buscar_registros()
   where uid = 'c1' and dados is null and excluido_em is not null;
  if n <> 1 then raise exception 'FALHOU: a exclusão deveria constar'; end if;

  -- paginação estável: 3 linhas com a mesma hora de recebimento, páginas de 2
  r := public.enviar_registros(
    '[{"tabela":"rendas","uid":"p1","dados":{},"atualizado_em":"2026-11-01T10:00:00Z"},
      {"tabela":"rendas","uid":"p2","dados":{},"atualizado_em":"2026-11-01T10:00:00Z"},
      {"tabela":"rendas","uid":"p3","dados":{},"atualizado_em":"2026-11-01T10:00:00Z"}]'::jsonb);
  select recebido_em, tabela, uid into ultimo
    from public.buscar_registros(null, '', '', 2) order by recebido_em desc, tabela desc, uid desc limit 1;
  select count(*) into n from public.buscar_registros(ultimo.recebido_em, ultimo.tabela, ultimo.uid, 100);
  select count(*) - 2 into n from public.buscar_registros();  -- total menos a 1ª página
  if n < 1 then raise exception 'FALHOU: a paginação deveria ter mais páginas'; end if;

  -- tabela desconhecida é recusada
  begin
    perform public.enviar_registros('[{"tabela":"outra","uid":"z","dados":{},"atualizado_em":"2026-11-01T10:00:00Z"}]'::jsonb);
    raise exception 'FALHOU: tabela desconhecida foi aceita';
  exception when check_violation then null;
  end;

  -- A não grava direto na tabela
  begin
    insert into public.registros (usuario_id, tabela, uid, dados, atualizado_em)
    values (a, 'contas', 'direto', '{}', now());
    raise exception 'FALHOU: A conseguiu gravar direto na tabela';
  exception when insufficient_privilege then null;
  end;

  reset role;

  -- ===== como B =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.buscar_registros();
  if n <> 0 then raise exception 'FALHOU: B vê % linhas do A', n; end if;
  select count(*) into n from public.registros;
  if n <> 0 then raise exception 'FALHOU: B leu % linhas do A direto na tabela', n; end if;

  -- B grava a mesma chave e não mexe no A
  r := public.enviar_registros(
    '[{"tabela":"contas","uid":"c1","dados":{"nome":"Do B"},"atualizado_em":"2026-11-04T10:00:00Z"}]'::jsonb);
  reset role;
  select count(*) into n from public.registros where usuario_id = a and uid = 'c1' and dados is null;
  if n <> 1 then raise exception 'FALHOU: a linha do A foi alterada pelo B'; end if;

  -- ===== IA: contador de usos por pessoa =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if not public.registrar_uso_ia(2) then raise exception 'FALHOU: 1o uso da IA deveria passar'; end if;
  if not public.registrar_uso_ia(2) then raise exception 'FALHOU: 2o uso da IA deveria passar'; end if;
  if public.registrar_uso_ia(2) then raise exception 'FALHOU: 3o uso passou do limite de 2'; end if;
  if public.registrar_uso_ia(0) then raise exception 'FALHOU: limite 0 deveria recusar'; end if;
  begin
    perform * from public.ia_uso;
    raise exception 'FALHOU: A leu a tabela ia_uso direto';
  exception when insufficient_privilege then null;
  end;
  -- o B tem o próprio contador, não é afetado pelo A
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if not public.registrar_uso_ia(2) then raise exception 'FALHOU: contador do B afetado pelo A'; end if;
  reset role;
  select usos into n from public.ia_uso where usuario_id = a;
  if n <> 2 then raise exception 'FALHOU: A deveria ter 2 usos, tem %', n; end if;

  -- ===== sem login (anon) =====
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  begin
    perform public.enviar_registros('[]'::jsonb);
    raise exception 'FALHOU: anon chamou enviar_registros';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.registros;
    raise exception 'FALHOU: anon leu a tabela';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- desfaz tudo (a exceção abaixo cancela a transação inteira)
  raise exception 'OK: todas as verificações passaram (nada foi gravado)';
end
$$;

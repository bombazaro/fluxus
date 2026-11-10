-- Fluxus: servidor da conta sincronizada.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema: tudo usa "if not exists" / "create or replace".
--
-- Modelo: uma tabela genérica `registros`, com uma linha para cada linha das tabelas do app
-- (conta, lançamento, renda...). O conteúdo da linha vai em `dados` (jsonb). Exclusões ficam
-- como linhas com `excluido_em` preenchido, para os outros aparelhos saberem que sumiram.
--
-- Segurança: o app NUNCA lê nem grava a tabela direto. Ele usa só as três funções no fim do
-- arquivo, que sempre filtram por auth.uid() (o usuário logado). A tabela também tem RLS
-- (regras por linha) como segunda barreira.

create table if not exists public.registros (
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  tabela        text        not null
                check (tabela in (
                  'categorias', 'pessoas', 'contas', 'lancamentos', 'lancamentos_ignorados',
                  'divisoes', 'rendas', 'rendas_recebidas', 'reserva_meta', 'reserva_aportes',
                  'configuracoes'
                )),
  uid           text        not null check (char_length(uid) between 1 and 100),
  -- conteúdo da linha; nulo quando a linha foi excluída
  dados         jsonb,
  -- quando a pessoa mexeu na linha (hora do aparelho, nunca no futuro): decide quem vence
  atualizado_em timestamptz not null,
  excluido_em   timestamptz,
  -- quando o servidor recebeu a linha (hora do servidor): é o marcador de "o que há de novo"
  recebido_em   timestamptz not null default now(),
  primary key (usuario_id, tabela, uid)
);

create index if not exists registros_novidades
  on public.registros (usuario_id, recebido_em, tabela, uid);

alter table public.registros enable row level security;

-- Ninguém acessa a tabela direto, a não ser para ler as próprias linhas.
revoke all on public.registros from anon, authenticated;
grant select on public.registros to authenticated;

drop policy if exists "ler as proprias linhas" on public.registros;
create policy "ler as proprias linhas" on public.registros
  for select to authenticated
  using (usuario_id = (select auth.uid()));

-- Não há política de insert, update nem delete: gravar só pela função abaixo.

-- ---------------------------------------------------------------------------------------
-- enviar_registros(lote): grava até 500 linhas de uma vez.
-- Cada item: { "tabela": "...", "uid": "...", "dados": {...} ou null,
--              "atualizado_em": "2026-11-05T10:00:00.000Z", "excluido_em": "..." ou null }
-- Só vale se for mais novo que o que o servidor já tem (a edição mais recente vence).
-- Devolve { "recebido_em": hora do servidor, "aplicados": quantas linhas valeram }.
-- ---------------------------------------------------------------------------------------
create or replace function public.enviar_registros(lote jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario   uuid := auth.uid();
  agora     timestamptz := now();
  item      jsonb;
  aplicados integer := 0;
  linhas    integer;
begin
  if usuario is null then
    raise exception 'Entre na sua conta para sincronizar.' using errcode = '28000';
  end if;
  if lote is null or jsonb_typeof(lote) <> 'array' then
    raise exception 'Lote inválido.' using errcode = '22023';
  end if;
  if jsonb_array_length(lote) > 500 then
    raise exception 'Lote grande demais (máximo 500 linhas).' using errcode = '22023';
  end if;
  if length(lote::text) > 5000000 then
    raise exception 'Lote grande demais.' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(lote) loop
    insert into public.registros as r
      (usuario_id, tabela, uid, dados, atualizado_em, excluido_em, recebido_em)
    values (
      usuario,
      item ->> 'tabela',
      item ->> 'uid',
      case when jsonb_typeof(item -> 'dados') = 'object' then item -> 'dados' else null end,
      -- um relógio adiantado no aparelho não pode ganhar de todas as edições futuras
      least((item ->> 'atualizado_em')::timestamptz, agora),
      (item ->> 'excluido_em')::timestamptz,
      agora
    )
    on conflict (usuario_id, tabela, uid) do update
      set dados         = excluded.dados,
          atualizado_em = excluded.atualizado_em,
          excluido_em   = excluded.excluido_em,
          recebido_em   = excluded.recebido_em
      where r.atualizado_em < excluded.atualizado_em;

    get diagnostics linhas = row_count;
    aplicados := aplicados + linhas;
  end loop;

  return jsonb_build_object('recebido_em', agora, 'aplicados', aplicados);
end;
$$;

-- ---------------------------------------------------------------------------------------
-- buscar_registros(...): o que o servidor recebeu depois do marcador, em ordem estável.
-- Para continuar de onde parou, passe a hora, a tabela e o uid da última linha recebida.
-- ---------------------------------------------------------------------------------------
create or replace function public.buscar_registros(
  desde        timestamptz default null,
  desde_tabela text default '',
  desde_uid    text default '',
  limite       integer default 500
)
returns setof public.registros
language sql
security definer
stable
set search_path = ''
as $$
  select r.*
  from public.registros r
  where r.usuario_id = auth.uid()
    and (
      desde is null
      or (r.recebido_em, r.tabela, r.uid)
           > (desde, coalesce(desde_tabela, ''), coalesce(desde_uid, ''))
    )
  order by r.recebido_em, r.tabela, r.uid
  limit least(greatest(coalesce(limite, 500), 1), 1000);
$$;

-- ---------------------------------------------------------------------------------------
-- excluir_meus_dados(): apaga tudo o que a pessoa guardou na nuvem (não apaga o login).
-- ---------------------------------------------------------------------------------------
create or replace function public.excluir_meus_dados()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
  apagadas integer;
begin
  if usuario is null then
    raise exception 'Entre na sua conta.' using errcode = '28000';
  end if;
  delete from public.registros where usuario_id = usuario;
  get diagnostics apagadas = row_count;
  return apagadas;
end;
$$;

-- Só quem está logado chama as funções (por padrão o Postgres libera para todos).
revoke all on function public.enviar_registros(jsonb) from public, anon;
revoke all on function public.buscar_registros(timestamptz, text, text, integer) from public, anon;
revoke all on function public.excluir_meus_dados() from public, anon;
grant execute on function public.enviar_registros(jsonb) to authenticated;
grant execute on function public.buscar_registros(timestamptz, text, text, integer) to authenticated;
grant execute on function public.excluir_meus_dados() to authenticated;

-- ---------------------------------------------------------------------------------------
-- IA no cadastro: contador de usos por pessoa e por dia (só o número, nunca o texto).
-- A função "ia" (Edge Function) chama registrar_uso_ia com o login da própria pessoa.
-- ---------------------------------------------------------------------------------------
create table if not exists public.ia_uso (
  usuario_id uuid    not null references auth.users (id) on delete cascade,
  dia        date    not null,
  usos       integer not null default 0,
  primary key (usuario_id, dia)
);
-- Sem nenhuma regra de acesso: ninguém lê nem grava a tabela direto, só pela função abaixo.
alter table public.ia_uso enable row level security;
revoke all on public.ia_uso from anon, authenticated;

create or replace function public.registrar_uso_ia(limite integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
  total integer;
begin
  if usuario is null then
    raise exception 'Entre na sua conta.' using errcode = '28000';
  end if;
  if limite is null or limite < 1 then
    return false;
  end if;
  -- Soma 1 só se ainda não chegou ao limite; sem linha devolvida = limite atingido.
  insert into public.ia_uso (usuario_id, dia, usos)
  values (usuario, (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (usuario_id, dia) do update
    set usos = public.ia_uso.usos + 1
    where public.ia_uso.usos < limite
  returning usos into total;
  return total is not null;
end;
$$;

revoke all on function public.registrar_uso_ia(integer) from public, anon;
grant execute on function public.registrar_uso_ia(integer) to authenticated;

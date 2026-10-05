-- CJ Gerenciamento — esquema Supabase (cole no SQL Editor e execute uma vez)
-- Troque o email do ADM abaixo se não for tvvibeoficial@gmail.com (também em VITE_ADM_EMAIL).

-- 1) Dados de cada proprietário (só ele lê e escreve a sua linha)
create table if not exists public.houses (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  account    jsonb not null,
  data       jsonb not null,
  admin      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.houses enable row level security;

drop policy if exists "houses_select_own" on public.houses;
drop policy if exists "houses_insert_own" on public.houses;
drop policy if exists "houses_update_own" on public.houses;
create policy "houses_select_own" on public.houses for select to authenticated using (auth.uid() = user_id);
create policy "houses_insert_own" on public.houses for insert to authenticated with check (auth.uid() = user_id);
create policy "houses_update_own" on public.houses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Conteúdo global do ADM (anúncios, salas, avisos, gerentes, memórias da IA)
--    Todos leem; só o email do ADM escreve.
create table if not exists public.adm_global (
  id         int primary key check (id = 1),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.adm_global enable row level security;

drop policy if exists "adm_read_all"    on public.adm_global;
drop policy if exists "adm_insert_adm"  on public.adm_global;
drop policy if exists "adm_update_adm"  on public.adm_global;
create policy "adm_read_all" on public.adm_global for select to anon, authenticated using (true);
create policy "adm_insert_adm" on public.adm_global for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'tvvibeoficial@gmail.com');
create policy "adm_update_adm" on public.adm_global for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'tvvibeoficial@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'tvvibeoficial@gmail.com');


-- =====================================================================
-- 3) FUNCIONÁRIOS EM OUTRO TELEMÓVEL (v5.5)
--    Pode voltar a correr este ficheiro inteiro: é seguro repetir.
-- =====================================================================

-- 3.1) «rev» = número de versão dos dados da casa. Cada gravação soma 1;
--      quem grava tem de partir da versão mais recente (evita perder alterações).
alter table public.houses add column if not exists rev bigint not null default 0;

-- 3.2) Acessos dos funcionários. Só o proprietário lê e escreve os seus.
--      O código de convite é ÚNICO em toda a nuvem (nunca cai na casa errada).
create table if not exists public.staff_access (
  owner_uid  uuid not null references auth.users(id) on delete cascade,
  staff_id   text not null,
  invite     text not null,               -- só letras e números, maiúsculas
  user_code  text not null,
  pass       text not null,               -- hash «v1$sal$hash» (nunca a palavra-passe)
  name       text not null default '',
  perms      jsonb not null default '[]'::jsonb,
  active     boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (owner_uid, staff_id),
  unique (invite)
);
alter table public.staff_access enable row level security;
drop policy if exists "staff_access_select_own" on public.staff_access;
drop policy if exists "staff_access_insert_own" on public.staff_access;
drop policy if exists "staff_access_update_own" on public.staff_access;
drop policy if exists "staff_access_delete_own" on public.staff_access;
create policy "staff_access_select_own" on public.staff_access for select to authenticated using (auth.uid() = owner_uid);
create policy "staff_access_insert_own" on public.staff_access for insert to authenticated with check (auth.uid() = owner_uid);
create policy "staff_access_update_own" on public.staff_access for update to authenticated using (auth.uid() = owner_uid) with check (auth.uid() = owner_uid);
create policy "staff_access_delete_own" on public.staff_access for delete to authenticated using (auth.uid() = owner_uid);

-- 3.3) Sessões dos funcionários e contagem de tentativas (sem políticas = só as funções abaixo lhes tocam)
create table if not exists public.staff_sessions (
  token_hash text primary key,
  owner_uid  uuid not null,
  staff_id   text not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
alter table public.staff_sessions enable row level security;

create table if not exists public.staff_attempts (
  invite       text primary key,
  n            int not null default 0,
  locked_until timestamptz
);
alter table public.staff_attempts enable row level security;

-- 3.4) Funções auxiliares (privadas)
create or replace function public._norm(t text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function public._thash(t text) returns text
language sql immutable as $$ select encode(sha256(convert_to(coalesce(t, ''), 'utf8')), 'hex') $$;

-- quem é este funcionário? (null se a sessão não existe, foi removido ou está bloqueado)
create or replace function public._staff_ctx(p_token text) returns public.staff_access
language plpgsql security definer set search_path = public as $$
declare r public.staff_access%rowtype;
begin
  select sa.* into r
    from public.staff_sessions s
    join public.staff_access sa on sa.owner_uid = s.owner_uid and sa.staff_id = s.staff_id
   where s.token_hash = public._thash(p_token) and sa.active;
  if not found then return null; end if;
  update public.staff_sessions set last_seen = now() where token_hash = public._thash(p_token);
  return r;
end $$;

-- o que o funcionário pode ver: sem a chave da IA, sem a palavra-passe da casa e só o seu próprio registo de equipa
create or replace function public._staff_view(p_data jsonb, p_staff_id text) returns jsonb
language sql stable as $$
  select jsonb_set(
    jsonb_set(coalesce(p_data, '{}'::jsonb), '{config}', coalesce(p_data -> 'config', '{}'::jsonb) - 'aiKey' - 'password'),
    '{staff}',
    coalesce((select jsonb_agg(e - 'pass') from jsonb_array_elements(coalesce(p_data -> 'staff', '[]'::jsonb)) e where e ->> 'id' = p_staff_id), '[]'::jsonb)
  )
$$;

revoke all on function public._staff_ctx(text) from public, anon, authenticated;
revoke all on function public._staff_view(jsonb, text) from public, anon, authenticated;

-- 3.5) PROPRIETÁRIO: ler / gravar a casa com controlo de versão
create or replace function public.house_get(p_known_rev bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); h public.houses%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into h from public.houses where user_id = v_uid;
  if not found then return jsonb_build_object('ok', true, 'exists', false, 'rev', 0, 'changed', false); end if;
  if p_known_rev is not null and p_known_rev = h.rev then
    return jsonb_build_object('ok', true, 'exists', true, 'rev', h.rev, 'changed', false);
  end if;
  return jsonb_build_object('ok', true, 'exists', true, 'rev', h.rev, 'changed', true,
                            'account', h.account, 'data', h.data, 'admin', h.admin);
end $$;

create or replace function public.house_push(p_account jsonb, p_data jsonb, p_admin jsonb, p_base_rev bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); h public.houses%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into h from public.houses where user_id = v_uid for update;
  if not found then
    insert into public.houses(user_id, account, data, admin, rev, updated_at) values (v_uid, p_account, p_data, p_admin, 1, now());
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if p_base_rev is distinct from h.rev then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'rev', h.rev, 'account', h.account, 'data', h.data, 'admin', h.admin);
  end if;
  update public.houses set account = p_account, data = p_data, admin = p_admin, rev = h.rev + 1, updated_at = now() where user_id = v_uid;
  return jsonb_build_object('ok', true, 'rev', h.rev + 1);
end $$;

-- o código de convite já existe noutra conta? (true = livre)
create or replace function public.invite_free(p_invite text, p_staff_id text default null) returns boolean
language sql security definer set search_path = public as $$
  select not exists (
    select 1 from public.staff_access
     where invite = public._norm(p_invite)
       and not (owner_uid = auth.uid() and staff_id = coalesce(p_staff_id, ''))
  )
$$;

-- 3.6) FUNCIONÁRIO (sem conta Supabase): entra com convite + código + palavra-passe
create or replace function public.staff_salt(p_invite text, p_user text) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  select pass into v from public.staff_access where invite = public._norm(p_invite) and user_code = public._norm(p_user) limit 1;
  if v is null or position('v1$' in v) <> 1 then
    return substr(public._thash('fake:' || public._norm(p_invite) || ':' || public._norm(p_user)), 1, 10);
  end if;
  return split_part(v, '$', 2);
end $$;

create or replace function public.staff_login(p_invite text, p_user text, p_pass text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv text := public._norm(p_invite);
  r public.staff_access%rowtype;
  a public.staff_attempts%rowtype;
  h public.houses%rowtype;
  tok text;
begin
  if not exists (select 1 from public.staff_access where invite = inv) then
    return jsonb_build_object('ok', false, 'error', 'bad');
  end if;
  select * into a from public.staff_attempts where invite = inv;
  if found and a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'wait', ceil(extract(epoch from (a.locked_until - now())))::int);
  end if;
  select * into r from public.staff_access where invite = inv and user_code = public._norm(p_user);
  if not found or r.pass is distinct from p_pass then
    insert into public.staff_attempts(invite, n, locked_until) values (inv, 1, null)
    on conflict (invite) do update set
      n = case when public.staff_attempts.n + 1 >= 5 then 0 else public.staff_attempts.n + 1 end,
      locked_until = case when public.staff_attempts.n + 1 >= 5 then now() + interval '30 seconds' else null end;
    return jsonb_build_object('ok', false, 'error', 'bad');
  end if;
  if not r.active then return jsonb_build_object('ok', false, 'error', 'blocked'); end if;
  select * into h from public.houses where user_id = r.owner_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'nohouse'); end if;
  delete from public.staff_attempts where invite = inv;
  delete from public.staff_sessions where created_at < now() - interval '90 days';
  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.staff_sessions(token_hash, owner_uid, staff_id) values (public._thash(tok), r.owner_uid, r.staff_id);
  return jsonb_build_object('ok', true, 'token', tok, 'staff_id', r.staff_id,
                            'account', h.account - 'passHash' - 'login' - 'display');
end $$;

create or replace function public.staff_pull(p_token text, p_known_rev bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.staff_access%rowtype; h public.houses%rowtype;
begin
  select * into r from public._staff_ctx(p_token);
  if r.staff_id is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into h from public.houses where user_id = r.owner_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'nohouse'); end if;
  if p_known_rev is not null and p_known_rev = h.rev then
    return jsonb_build_object('ok', true, 'rev', h.rev, 'changed', false);
  end if;
  return jsonb_build_object('ok', true, 'rev', h.rev, 'changed', true,
    'data', public._staff_view(h.data, r.staff_id),
    'account', h.account - 'passHash' - 'login' - 'display',
    'billing', coalesce(h.admin -> 'billing', '{}'::jsonb) - 'payments');
end $$;

-- o funcionário só escreve listas de dados da casa; nunca a equipa, a configuração nem o registo de atividade já existente
create or replace function public.staff_push(p_token text, p_data jsonb, p_base_rev bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.staff_access%rowtype; h public.houses%rowtype;
  nd jsonb; k text; act jsonb;
  cols text[] := array['stations','sessions','bookings','players','transactions','notifications','inventory','stockMoves','catalog','history'];
begin
  select * into r from public._staff_ctx(p_token);
  if r.staff_id is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into h from public.houses where user_id = r.owner_uid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'nohouse'); end if;
  if p_base_rev is distinct from h.rev then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'rev', h.rev,
                              'data', public._staff_view(h.data, r.staff_id),
                              'billing', coalesce(h.admin -> 'billing', '{}'::jsonb) - 'payments');
  end if;
  nd := h.data;
  foreach k in array cols loop
    if jsonb_typeof(p_data -> k) = 'array' then nd := jsonb_set(nd, array[k], p_data -> k); end if;
  end loop;
  -- registo de atividade: só se acrescenta (nada do que já existe se apaga)
  with u as (
    select e from jsonb_array_elements(coalesce(p_data -> 'activity', '[]'::jsonb)) as t(e)
    union
    select e from jsonb_array_elements(coalesce(h.data -> 'activity', '[]'::jsonb)) as t(e)
  )
  select coalesce(jsonb_agg(e order by (e ->> 'id')::numeric desc), '[]'::jsonb) into act
    from (select e from u order by (e ->> 'id')::numeric desc limit 3000) z;
  nd := jsonb_set(nd, '{activity}', act);
  update public.houses set data = nd, rev = h.rev + 1, updated_at = now() where user_id = h.user_id;
  return jsonb_build_object('ok', true, 'rev', h.rev + 1);
end $$;

create or replace function public.staff_logout(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.staff_sessions where token_hash = public._thash(p_token)
$$;

-- permissões de execução
revoke all on function public.house_get(bigint), public.house_push(jsonb, jsonb, jsonb, bigint), public.invite_free(text, text) from public, anon;
grant execute on function public.house_get(bigint), public.house_push(jsonb, jsonb, jsonb, bigint), public.invite_free(text, text) to authenticated;
revoke all on function public.staff_salt(text, text), public.staff_login(text, text, text), public.staff_pull(text, bigint),
                       public.staff_push(text, jsonb, bigint), public.staff_logout(text) from public;
grant execute on function public.staff_salt(text, text), public.staff_login(text, text, text), public.staff_pull(text, bigint),
                          public.staff_push(text, jsonb, bigint), public.staff_logout(text) to anon, authenticated;

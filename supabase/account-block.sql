-- Bloqueio no servidor: contas suspensas ou vencidas deixam de sincronizar/entrar

create or replace function public.house_get(p_known_rev bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); h public.houses%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if public._is_blocked(v_uid) then return jsonb_build_object('ok', false, 'error', 'blocked'); end if;
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
  if public._is_blocked(v_uid) then return jsonb_build_object('ok', false, 'error', 'blocked'); end if;
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

-- funcionário: sessões de contas bloqueadas deixam de valer (pull e push passam a responder 'auth')
create or replace function public._staff_ctx(p_token text) returns public.staff_access
language plpgsql security definer set search_path = public as $$
declare r public.staff_access%rowtype;
begin
  select sa.* into r
  from public.staff_sessions s
  join public.staff_access sa on sa.owner_uid = s.owner_uid and sa.staff_id = s.staff_id
  where s.token_hash = public._thash(p_token) and sa.active and not public._is_blocked(sa.owner_uid);
  if not found then return null; end if;
  update public.staff_sessions set last_seen = now() where token_hash = public._thash(p_token);
  return r;
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
  if public._is_blocked(r.owner_uid) then return jsonb_build_object('ok', false, 'error', 'blocked'); end if;
  select * into h from public.houses where user_id = r.owner_uid;
  if not found then return jsonb_build_object('ok', false, 'error', 'nohouse'); end if;
  delete from public.staff_attempts where invite = inv;
  delete from public.staff_sessions where created_at < now() - interval '90 days';
  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.staff_sessions(token_hash, owner_uid, staff_id) values (public._thash(tok), r.owner_uid, r.staff_id);
  return jsonb_build_object('ok', true, 'token', tok, 'staff_id', r.staff_id,
    'account', h.account - 'passHash' - 'login' - 'display');
end $$;

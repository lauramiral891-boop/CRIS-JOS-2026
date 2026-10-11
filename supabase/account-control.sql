-- Controlo de contas e pagamentos (só o ADM escreve)
create table if not exists public.account_control (
  owner_uid uuid primary key,
  status text not null default 'active' check (status in ('active','suspended')),
  paid_until timestamptz,
  grace_days int not null default 0,
  plan text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.account_control enable row level security;
revoke all on public.account_control from anon, authenticated;

-- true = conta bloqueada. Sem linha = livre (contas antigas continuam a funcionar)
create or replace function public._is_blocked(p_uid uuid) returns boolean
language sql security definer set search_path = public as $$
  select coalesce((select c.status = 'suspended'
    or (c.paid_until is not null and c.paid_until + (c.grace_days || ' days')::interval < now())
    from public.account_control c where c.owner_uid = p_uid), false)
$$;

-- lista de todas as contas para o ADM
create or replace function public.adm_accounts()
returns table(owner_uid uuid, account_id text, email text, house_name text, created_at timestamptz,
  last_access timestamptz, status text, paid_until timestamptz, plan text, note text, blocked boolean)
language plpgsql security definer set search_path = public, auth as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'tvvibeoficial@gmail.com' then
    raise exception 'ADM access required'; end if;
  return query
  select h.user_id, h.account ->> 'id', u.email::text,
    coalesce(h.account ->> 'houseName', h.account ->> 'name', ''), u.created_at,
    (select max(l.accessed_at) from public.account_access_logs l where l.owner_uid = h.user_id),
    coalesce(c.status,'active'), c.paid_until, coalesce(c.plan,''), coalesce(c.note,''),
    public._is_blocked(h.user_id)
  from public.houses h
  left join auth.users u on u.id = h.user_id
  left join public.account_control c on c.owner_uid = h.user_id
  order by u.created_at desc;
end $$;

-- suspender / ativar / definir plano e nota
create or replace function public.adm_set_control(p_owner uuid, p_status text, p_plan text, p_note text, p_grace int default 0)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'tvvibeoficial@gmail.com' then
    raise exception 'ADM access required'; end if;
  insert into public.account_control(owner_uid, status, plan, note, grace_days)
  values (p_owner, p_status, left(coalesce(p_plan,''),40), left(coalesce(p_note,''),300), greatest(coalesce(p_grace,0),0))
  on conflict (owner_uid) do update set status = excluded.status, plan = excluded.plan,
    note = excluded.note, grace_days = excluded.grace_days, updated_at = now();
end $$;

-- confirmar pagamento: soma dias a partir de hoje ou do fim atual
create or replace function public.adm_confirm_payment(p_owner uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = public, auth as $$
declare v timestamptz;
begin
  if lower(coalesce(auth.jwt() ->> 'email','')) <> 'tvvibeoficial@gmail.com' then
    raise exception 'ADM access required'; end if;
  insert into public.account_control(owner_uid, status, paid_until)
  values (p_owner, 'active', now() + (greatest(p_days,1) || ' days')::interval)
  on conflict (owner_uid) do update set status = 'active',
    paid_until = greatest(now(), coalesce(public.account_control.paid_until, now())) + (greatest(p_days,1) || ' days')::interval,
    updated_at = now()
  returning paid_until into v;
  return v;
end $$;

-- o proprietário vê o seu próprio estado
create or replace function public.my_control() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('blocked', public._is_blocked(auth.uid()),
    'status', coalesce(c.status,'active'), 'paid_until', c.paid_until)
  from (select 1) x left join public.account_control c on c.owner_uid = auth.uid()
$$;

revoke all on function public._is_blocked(uuid) from public, anon, authenticated;
revoke all on function public.adm_accounts() from public, anon;
revoke all on function public.adm_set_control(uuid,text,text,text,int) from public, anon;
revoke all on function public.adm_confirm_payment(uuid,int) from public, anon;
revoke all on function public.my_control() from public, anon;
grant execute on function public.adm_accounts() to authenticated;
grant execute on function public.adm_set_control(uuid,text,text,text,int) to authenticated;
grant execute on function public.adm_confirm_payment(uuid,int) to authenticated;
grant execute on function public.my_control() to authenticated;

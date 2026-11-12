-- WhatsApp automation: mover roster + once-only guard for "new lead" pings to movers.

create table if not exists movematch.movers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '',
  phone text not null unique check (phone ~ '^0\d{8,9}$'),
  active boolean not null default true,
  opted_out_at timestamptz
);
alter table movematch.movers enable row level security;

alter table movematch.leads add column if not exists movers_pinged_at timestamptz;
alter table movematch.leads add column if not exists movers_pinged_count int;

create or replace function public.mm_check_admin(p_secret text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_secret is null or not exists (select 1 from movematch.settings where key='admin_secret' and value=p_secret) then
    raise exception 'forbidden';
  end if;
end $$;

create or replace function public.mm_admin_movers(p_secret text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query select to_jsonb(m) from movematch.movers m order by m.active desc, m.created_at;
end $$;

create or replace function public.mm_admin_add_mover(p_secret text, p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers;
begin
  perform public.mm_check_admin(p_secret);
  if p_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  insert into movematch.movers(name, phone) values (left(coalesce(p_name,''),120), p_phone)
  on conflict (phone) do update set name = case when excluded.name <> '' then excluded.name else movematch.movers.name end,
    active = true, opted_out_at = null
  returning * into m;
  return to_jsonb(m);
end $$;

create or replace function public.mm_admin_set_mover_active(p_secret text, p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.movers set active = p_active, opted_out_at = case when p_active then null else opted_out_at end where id = p_id;
end $$;

create or replace function public.mm_admin_delete_mover(p_secret text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  delete from movematch.movers where id = p_id;
end $$;

-- Returns the active movers exactly once per lead (first caller wins); later calls get an empty list.
create or replace function public.mm_claim_mover_ping(p_secret text, p_id uuid) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.mm_check_admin(p_secret);
  select count(*) into n from movematch.movers where active;
  update movematch.leads set movers_pinged_at = now(), movers_pinged_count = n
   where id = p_id and movers_pinged_at is null and status = 'complete';
  if not found then return; end if;
  return query select to_jsonb(m) from movematch.movers m where m.active order by m.created_at;
end $$;

-- A mover replied STOP: switch them off. Returns true if a mover matched.
create or replace function public.mm_mover_opt_out(p_secret text, p_phone text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.movers set active = false, opted_out_at = now() where phone = p_phone and active;
  return found;
end $$;

revoke all on function public.mm_check_admin(text) from public, anon, authenticated;

-- Leads completed before this feature are treated as already sent to movers.
update movematch.leads set movers_pinged_at = created_at, movers_pinged_count = 0 where status='complete' and movers_pinged_at is null;

-- 003: opt-out list (anyone who replies "הסר"/STOP) — checked before messaging clients.
create table if not exists movematch.wa_optouts (phone text primary key, created_at timestamptz not null default now());
alter table movematch.wa_optouts enable row level security;
-- mm_mover_opt_out now also inserts into wa_optouts; mm_wa_opted_out(p_secret, p_phone) checks it;
-- mm_admin_add_mover clears it. (Full definitions applied as migration 003_whatsapp_optouts.)

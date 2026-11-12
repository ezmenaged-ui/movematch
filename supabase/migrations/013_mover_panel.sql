-- 013: Mover panel (/mover). Email + password sign-in through Supabase Auth.
-- Every mover_* function resolves the caller from auth.uid() and only touches that mover's rows.
-- Tables stay closed to the API (RLS on, no policies); access is only through these functions.

alter table movematch.movers
  add column if not exists auth_user_id uuid unique,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists business jsonb not null default '{}'::jsonb;

alter table movematch.bids
  add column if not exists booked_at timestamptz,
  add column if not exists job_date date,
  add column if not exists job_time time,
  add column if not exists job_done_at timestamptz;

create table if not exists movematch.mover_events (
  id uuid primary key default gen_random_uuid(),
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  uid text not null,
  date date not null,
  time time,
  title text not null,
  created_at timestamptz not null default now(),
  unique (mover_id, uid)
);
alter table movematch.mover_events enable row level security;

create table if not exists movematch.mover_invoices (
  id uuid primary key default gen_random_uuid(),
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  bid_id uuid references movematch.bids(id) on delete set null,
  number int not null,
  created_at timestamptz not null default now(),
  data jsonb not null,
  unique (mover_id, number)
);
alter table movematch.mover_invoices enable row level security;

create table if not exists movematch.mover_resets (
  token_hash text primary key,
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table movematch.mover_resets enable row level security;

revoke all on movematch.mover_events, movematch.mover_invoices, movematch.mover_resets from anon, authenticated;

-- The signed-in mover (approved, linked to auth.uid()). Raises 'forbidden' otherwise.
create or replace function movematch.me() returns movematch.movers
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers;
begin
  select * into m from movematch.movers where auth_user_id = auth.uid() and auth.uid() is not null and status = 'approved';
  if m.id is null then raise exception 'forbidden'; end if;
  return m;
end $$;
revoke all on function movematch.me() from public, anon, authenticated;

-- Leads a mover may see: finished tenders from funnels that ping movers, or any lead they bid on.
create or replace function movematch.mover_lead_json(l movematch.leads, m movematch.movers, p_full boolean)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'share_token', l.share_token, 'created_at', l.created_at,
    'closes_at', l.closes_at, 'now', now(),
    'open', case when l.closes_at is not null then l.closes_at > now() else l.created_at > now() - interval '7 days' end,
    'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'move_when', l.move_when,
    'videos', case when p_full then l.videos else to_jsonb(jsonb_array_length(l.videos)) end,
    'video_skipped', l.video_skipped,
    'items', case when p_full then l.items else to_jsonb(coalesce((select sum((i->>'qty')::int) from jsonb_array_elements(l.items->'list') i), 0)) end,
    'priority', l.priority,
    'bid_count', (select count(*) from movematch.bids x where x.lead_id = l.id and not x.hidden),
    'client', case when p_full then jsonb_build_object('name', l.name, 'phone', l.phone) end,
    'my_bid', (select to_jsonb(b) - 'mover_phone' - 'hidden' from movematch.bids b
                where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) order by b.updated_at desc limit 1))
$$;
revoke all on function movematch.mover_lead_json(movematch.leads, movematch.movers, boolean) from public, anon, authenticated;

create or replace function public.mm_mover_me() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return (to_jsonb(m) - 'logo' - 'token' - 'auth_user_id') || jsonb_build_object('has_logo', m.logo is not null);
end $$;

create or replace function public.mm_mover_leads() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(movematch.mover_lead_json(l, m, false) order by l.created_at desc)
    from movematch.leads l
    where (l.status = 'complete' and l.variant <> 'a' and l.created_at > now() - interval '60 days')
       or exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone))), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_lead(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id
    and ((x.status = 'complete' and x.variant <> 'a')
      or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone)));
  if l.id is null then return null; end if;
  return movematch.mover_lead_json(l, m, true);
end $$;

-- Submit / update an offer as the signed-in mover. Reuses mm_submit_bid (deadline + one offer per mover).
create or replace function public.mm_mover_submit_bid(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads where id = p_id and status = 'complete' and variant <> 'a';
  if l.id is null then raise exception 'not found'; end if;
  if exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) and b.booked_at is not null) then
    raise exception 'booked';
  end if;
  return public.mm_submit_bid(l.share_token, (p - 'mover_phone' - 'mover_name') || jsonb_build_object('mover_token', m.token::text));
end $$;

-- "The client chose me": put the job in the mover's calendar (or move it). p_date null = unbook.
create or replace function public.mm_mover_book(p_bid uuid, p_date date, p_time time) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); b movematch.bids;
begin
  update movematch.bids set
    booked_at = case when p_date is null then null else coalesce(booked_at, now()) end,
    job_date = p_date, job_time = case when p_date is null then null else p_time end,
    job_done_at = case when p_date is null then null else job_done_at end, updated_at = now()
  where id = p_bid and (mover_id = m.id or mover_phone = m.phone) returning * into b;
  if b.id is null then raise exception 'not found'; end if;
  return to_jsonb(b) - 'mover_phone';
end $$;

create or replace function public.mm_mover_job_done(p_bid uuid, p_done boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  update movematch.bids set job_done_at = case when p_done then now() end, updated_at = now()
  where id = p_bid and (mover_id = m.id or mover_phone = m.phone) and booked_at is not null;
end $$;

-- Profile: company/contact name, logo and invoicing details. Phone and ratings stay with the admin.
create or replace function public.mm_mover_save_profile(p jsonb, p_logo text, p_clear_logo boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); v_b jsonb := '{}'::jsonb; k text;
begin
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if coalesce(trim(p->>'company'), '') = '' then raise exception 'company required'; end if;
  foreach k in array array['slogan','legal_name','entity','tax_id','address','city','postal','email','website','phone'] loop
    v_b := v_b || jsonb_build_object(k, left(trim(coalesce(p->'business'->>k, '')), 180));
  end loop;
  if v_b->>'entity' not in ('dealer','company','exempt') then v_b := v_b || '{"entity":"dealer"}'; end if;
  if v_b->>'tax_id' <> '' and v_b->>'tax_id' !~ '^\d{9}$' then raise exception 'invalid tax id'; end if;
  update movematch.movers set name = left(trim(coalesce(p->>'name','')), 120), company_name = left(trim(p->>'company'), 120),
    business = v_b, logo = case when p_clear_logo then null else coalesce(p_logo, logo) end
  where id = m.id;
end $$;

create or replace function public.mm_mover_password_changed() returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  update movematch.movers set must_change_password = false where id = m.id;
end $$;

-- Calendar: imported events (ICS) live per mover.
create or replace function public.mm_mover_events() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'date', e.date, 'time', to_char(e.time, 'HH24:MI'), 'title', e.title) order by e.date, e.time)
    from movematch.mover_events e where e.mover_id = m.id), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_import_events(p jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); n int;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 2000 then raise exception 'invalid'; end if;
  insert into movematch.mover_events(mover_id, uid, date, time, title)
  select m.id, left(e->>'uid', 300), (e->>'date')::date, nullif(e->>'time','')::time, left(coalesce(nullif(e->>'title',''), 'אירוע'), 200)
  from jsonb_array_elements(p) e
  on conflict (mover_id, uid) do update set date = excluded.date, time = excluded.time, title = excluded.title;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.mm_mover_delete_event(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  delete from movematch.mover_events where id = p_id and mover_id = m.id;
end $$;

-- Invoice drafts: numbered per mover, with a snapshot of the business details at the time of saving.
create or replace function public.mm_mover_save_invoice(p_bid uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); v_id uuid; v_n int;
begin
  if p_bid is not null and not exists (select 1 from movematch.bids where id = p_bid and (mover_id = m.id or mover_phone = m.phone)) then
    raise exception 'not found';
  end if;
  perform pg_advisory_xact_lock(hashtext('mm_invoice_' || m.id::text));
  select coalesce(max(number), 0) + 1 into v_n from movematch.mover_invoices where mover_id = m.id;
  insert into movematch.mover_invoices(mover_id, bid_id, number, data)
  values (m.id, p_bid, v_n, p || jsonb_build_object('issuer', m.business || jsonb_build_object('company', m.company_name, 'name', m.name, 'mover_phone', m.phone, 'has_logo', m.logo is not null, 'mover_id', m.id)))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.mm_mover_invoices() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number, 'created_at', i.created_at, 'bid_id', i.bid_id, 'data', i.data) order by i.number desc)
    from movematch.mover_invoices i where i.mover_id = m.id), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_delete_invoice(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  delete from movematch.mover_invoices where id = p_id and mover_id = m.id;
end $$;

grant execute on function public.mm_mover_me(), public.mm_mover_leads(), public.mm_mover_lead(uuid), public.mm_mover_submit_bid(uuid, jsonb),
  public.mm_mover_book(uuid, date, time), public.mm_mover_job_done(uuid, boolean), public.mm_mover_save_profile(jsonb, text, boolean),
  public.mm_mover_password_changed(), public.mm_mover_events(), public.mm_mover_import_events(jsonb), public.mm_mover_delete_event(uuid),
  public.mm_mover_save_invoice(uuid, jsonb), public.mm_mover_invoices(), public.mm_mover_delete_invoice(uuid) to authenticated;
revoke execute on function public.mm_mover_me(), public.mm_mover_leads(), public.mm_mover_lead(uuid), public.mm_mover_submit_bid(uuid, jsonb),
  public.mm_mover_book(uuid, date, time), public.mm_mover_job_done(uuid, boolean), public.mm_mover_save_profile(jsonb, text, boolean),
  public.mm_mover_password_changed(), public.mm_mover_events(), public.mm_mover_import_events(jsonb), public.mm_mover_delete_event(uuid),
  public.mm_mover_save_invoice(uuid, jsonb), public.mm_mover_invoices(), public.mm_mover_delete_invoice(uuid) from public, anon;

-- ── Admin: give a mover a panel login (email + first password). Re-running resets the password. ──
create or replace function public.mm_admin_set_mover_login(p_secret text, p_mover uuid, p_email text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers; v_email text := lower(trim(p_email)); v_uid uuid; v_hash text;
begin
  perform public.mm_check_admin(p_secret);
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'short password'; end if;
  select * into m from movematch.movers where id = p_mover;
  if m.id is null then raise exception 'not found'; end if;
  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  select id into v_uid from auth.users where lower(email) = v_email;
  if v_uid is not null and exists (select 1 from movematch.movers where auth_user_id = v_uid and id <> m.id) then
    raise exception 'email in use';
  end if;
  if v_uid is null and m.auth_user_id is not null then
    -- Mover changes email: move the existing account.
    v_uid := m.auth_user_id;
    update auth.users set email = v_email, updated_at = now() where id = v_uid;
    update auth.identities set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
      where user_id = v_uid and provider = 'email';
  end if;
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, v_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('mover_id', m.id), now(), now(), '', '', '', '');
    insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = v_hash, email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, updated_at = now() where id = v_uid;
  end if;
  update movematch.movers set auth_user_id = v_uid, email = v_email, must_change_password = true where id = m.id;
  return jsonb_build_object('email', v_email);
end $$;

-- Remove panel access (keeps the mover on the roster).
create or replace function public.mm_admin_revoke_mover_login(p_secret text, p_mover uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid;
begin
  perform public.mm_check_admin(p_secret);
  select auth_user_id into v_uid from movematch.movers where id = p_mover;
  update movematch.movers set auth_user_id = null, must_change_password = false where id = p_mover;
  delete from auth.users u where u.id = v_uid or (u.raw_user_meta_data->>'mover_id' = p_mover::text);
end $$;

-- ── Forgot password (server-only, needs the admin secret). Token is emailed; only its hash is stored. ──
create or replace function public.mm_mover_request_reset(p_secret text, p_email text, p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers;
begin
  perform public.mm_check_admin(p_secret);
  select * into m from movematch.movers where lower(email) = lower(trim(p_email)) and auth_user_id is not null and status = 'approved';
  if m.id is null then return null; end if;
  if (select count(*) from movematch.mover_resets where mover_id = m.id and created_at > now() - interval '1 hour') >= 5 then return null; end if;
  insert into movematch.mover_resets(token_hash, mover_id, expires_at) values (p_token_hash, m.id, now() + interval '1 hour');
  return jsonb_build_object('name', m.name, 'company', m.company_name, 'email', m.email);
end $$;

create or replace function public.mm_mover_reset_password(p_secret text, p_token_hash text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.mover_resets; m movematch.movers;
begin
  perform public.mm_check_admin(p_secret);
  if length(coalesce(p_password, '')) < 8 then raise exception 'short password'; end if;
  select * into r from movematch.mover_resets where token_hash = p_token_hash for update;
  if r.token_hash is null or r.used_at is not null or r.expires_at < now() then raise exception 'invalid token'; end if;
  select * into m from movematch.movers where id = r.mover_id;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now() where id = m.auth_user_id;
  update movematch.mover_resets set used_at = now() where mover_id = m.id and used_at is null;
  update movematch.movers set must_change_password = false where id = m.id;
  return jsonb_build_object('email', m.email);
end $$;

revoke execute on function public.mm_admin_set_mover_login(text, uuid, text, text), public.mm_admin_revoke_mover_login(text, uuid),
  public.mm_mover_request_reset(text, text, text), public.mm_mover_reset_password(text, text, text) from public;
grant execute on function public.mm_admin_set_mover_login(text, uuid, text, text), public.mm_admin_revoke_mover_login(text, uuid),
  public.mm_mover_request_reset(text, text, text), public.mm_mover_reset_password(text, text, text) to anon;

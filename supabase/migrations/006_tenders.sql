-- Tenders: every lead is a "מכרז" with a 6-digit number and a short client link code.
-- Movers are pre-registered with company name + logo and get a personal token so the bid form knows them.

alter table movematch.leads add column if not exists tender_no int unique;
alter table movematch.leads add column if not exists client_code text unique;
alter table movematch.movers add column if not exists company_name text not null default '';
alter table movematch.movers add column if not exists logo text;           -- data: URI (small image)
alter table movematch.movers add column if not exists token uuid not null default gen_random_uuid() unique;
alter table movematch.bids add column if not exists mover_id uuid references movematch.movers(id) on delete set null;

create or replace function movematch.new_client_code() returns text
language plpgsql volatile set search_path = '' as $$
declare a text := 'abcdefghjkmnpqrstuvwxyz23456789'; c text;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    exit when not exists (select 1 from movematch.leads where client_code = c);
  end loop;
  return c;
end $$;

-- Next tender number: never round, grows by 3–19 each time so the sequence looks like a busy platform.
create or replace function movematch.lead_defaults() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(84613);
  if new.tender_no is null then
    select coalesce(max(tender_no), 284598) + 3 + floor(random() * 17)::int into new.tender_no from movematch.leads;
  end if;
  if new.client_code is null then new.client_code := movematch.new_client_code(); end if;
  return new;
end $$;

drop trigger if exists lead_defaults on movematch.leads;
create trigger lead_defaults before insert on movematch.leads for each row execute function movematch.lead_defaults();

-- Backfill existing leads in creation order.
do $$
declare r record; n int := 284598;
begin
  for r in select id from movematch.leads where tender_no is null order by created_at loop
    n := n + 3 + floor(random() * 17)::int;
    update movematch.leads set tender_no = n, client_code = coalesce(client_code, movematch.new_client_code()) where id = r.id;
  end loop;
end $$;

-- Mover-safe lead view now includes the tender number.
create or replace function public.mm_public_lead(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'created_at', l.created_at, 'status', l.status, 'variant', l.variant,
    'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'move_when', l.move_when,
    'videos', l.videos, 'video_skipped', l.video_skipped)
  from movematch.leads l where l.share_token = p_token;
$$;

-- Offers as the client sees them: company name + logo flag, never the mover's phone.
create or replace function movematch.client_offers_json(p_lead uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'price', b.price, 'available_date', b.available_date, 'available_flexible', b.available_flexible,
      'note', b.note, 'created_at', b.created_at,
      'company', coalesce(nullif(m.company_name, ''), nullif(b.mover_name, ''), ''),
      'mover_id', m.id, 'has_logo', m.logo is not null) order by b.created_at), '[]'::jsonb)
  from movematch.bids b left join movematch.movers m on m.id = b.mover_id
  where b.lead_id = p_lead and not b.hidden;
$$;

-- Tender page by short code. Resume data (edit token) only while the lead is still partial.
create or replace function public.mm_client_tender(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'created_at', l.created_at, 'status', l.status, 'variant', l.variant,
    'name', split_part(l.name, ' ', 1), 'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to,
    'move_when', l.move_when, 'videos', jsonb_array_length(l.videos), 'video_skipped', l.video_skipped,
    'offers', movematch.client_offers_json(l.id),
    'resume', case when l.status = 'partial' then jsonb_build_object('id', l.id, 'token', l.edit_token, 'name', l.name, 'phone', l.phone, 'city', l.city) end)
  from movematch.leads l where l.client_code = lower(p_code);
$$;

-- Old /o/<token> links: keep working, and expose the code so they can redirect.
create or replace function public.mm_client_offers(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', l.id, 'client_code', l.client_code, 'tender_no', l.tender_no,
    'name', split_part(l.name, ' ', 1), 'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'move_when', l.move_when,
    'offers', (select coalesce(jsonb_agg(o order by (o->>'price')::int), '[]'::jsonb) from jsonb_array_elements(movematch.client_offers_json(l.id)) o))
  from movematch.leads l where l.client_token = p_token;
$$;

-- Bid form: who is this mover (by personal token)?
create or replace function public.mm_mover_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'name', m.name, 'company', m.company_name, 'has_logo', m.logo is not null)
  from movematch.movers m where m.token = p_token;
$$;

create or replace function public.mm_mover_logo(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select logo from movematch.movers where id = p_id;
$$;

-- Submit/update a bid. With a mover token, the mover's phone + company come from the roster.
create or replace function public.mm_submit_bid(p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l movematch.leads; b movematch.bids; m movematch.movers; n int; is_new boolean; v_phone text; v_name text;
begin
  select * into l from movematch.leads where share_token = p_token;
  if l.id is null then raise exception 'not found'; end if;
  if coalesce(p->>'mover_token', '') ~ '^[0-9a-f-]{36}$' then
    select * into m from movematch.movers where token = (p->>'mover_token')::uuid;
  end if;
  v_phone := coalesce(m.phone, p->>'mover_phone');
  v_name := coalesce(nullif(m.company_name, ''), nullif(m.name, ''), left(p->>'mover_name', 120));
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  select count(*) into n from movematch.bids where lead_id = l.id;
  if n >= 50 then raise exception 'too many bids'; end if;
  is_new := not exists (select 1 from movematch.bids where lead_id = l.id and mover_phone = v_phone);
  insert into movematch.bids(lead_id, mover_phone, mover_name, mover_id, price, available_date, available_flexible, note)
  values (l.id, v_phone, v_name, m.id, (p->>'price')::int,
          nullif(p->>'available_date','')::date, coalesce((p->>'available_flexible')::boolean,false), left(p->>'note',1000))
  on conflict (lead_id, mover_phone) do update set
    mover_name = excluded.mover_name, mover_id = coalesce(excluded.mover_id, movematch.bids.mover_id), price = excluded.price,
    available_date = excluded.available_date, available_flexible = excluded.available_flexible, note = excluded.note, updated_at = now()
  returning * into b;
  return jsonb_build_object('bid', to_jsonb(b), 'is_new', is_new,
    'lead', to_jsonb(l) - 'edit_token',
    'bid_count', (select count(*) from movematch.bids where lead_id = l.id));
end $$;

-- Admin roster: never ship the logo blob in lists.
create or replace function public.mm_admin_movers(p_secret text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query select (to_jsonb(m) - 'logo') || jsonb_build_object('has_logo', m.logo is not null)
    from movematch.movers m order by m.active desc, m.created_at;
end $$;

create or replace function public.mm_admin_save_mover(p_secret text, p_id uuid, p_name text, p_company text, p_phone text, p_logo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers;
begin
  perform public.mm_check_admin(p_secret);
  if p_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp|gif|svg\+xml);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  delete from movematch.wa_optouts where phone = p_phone;
  if p_id is null then
    insert into movematch.movers(name, company_name, phone, logo) values (left(coalesce(p_name,''),120), left(coalesce(p_company,''),120), p_phone, p_logo)
    on conflict (phone) do update set name = excluded.name, company_name = excluded.company_name,
      logo = coalesce(excluded.logo, movematch.movers.logo), active = true, opted_out_at = null
    returning * into m;
  else
    update movematch.movers set name = left(coalesce(p_name,''),120), company_name = left(coalesce(p_company,''),120), phone = p_phone,
      logo = coalesce(p_logo, logo) where id = p_id returning * into m;
  end if;
  return to_jsonb(m) - 'logo';
end $$;

create or replace function public.mm_admin_clear_mover_logo(p_secret text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.movers set logo = null where id = p_id;
end $$;

-- Mover pings: include the personal token, not the logo.
create or replace function public.mm_claim_mover_ping(p_secret text, p_id uuid) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.mm_check_admin(p_secret);
  select count(*) into n from movematch.movers where active;
  update movematch.leads set movers_pinged_at = now(), movers_pinged_count = n
   where id = p_id and movers_pinged_at is null and status = 'complete';
  if not found then return; end if;
  return query select to_jsonb(m) - 'logo' from movematch.movers m where m.active order by m.created_at;
end $$;


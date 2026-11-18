-- Where a lead came in (18 Nov 2026), so the site can tell test traffic from live funnels:
--   entry = 'home' → the homepage movematch.co.il/ while it is the owner's test area. The client gets the usual
--                    messages, the operator gets the alert, but movers get nothing and real movers don't see it in
--                    their panel. The owner forwards real ones by hand (the /l/<token> link from /admin still works).
--                    Going live later: set HOME_LEADS_LIVE=1 in Vercel; new homepage leads are then stored with no entry.
--   entry = 'qa'   → the /qa test area. Always a test lead (is_test), email to the operator only, and it never
--                    triggers or counts toward the 30-day phone rule (so anyone shown the demo can still sign up for real).
--   entry is null  → a live funnel (/a … /e).

alter table movematch.leads add column if not exists entry text check (entry in ('home', 'qa'));

-- Test-lead rule (migration 021) + /qa leads.
create or replace function movematch.mark_test_lead() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.is_test := new.is_test
    or coalesce(new.name, '') ~* '^\s*QA\M'
    or lower(trim(coalesce(new.utm_source, ''))) = 'qa'
    or regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') in ('0546677361', '972546677361')
    or new.entry = 'qa';
  return new;
end $$;

drop trigger if exists leads_mark_test on movematch.leads;
create trigger leads_mark_test before insert or update of name, phone, utm_source, is_test, entry on movematch.leads
  for each row execute function movematch.mark_test_lead();

-- 30-day phone rule: /qa leads neither count nor get blocked.
create or replace function movematch.phone_cooldown_check(p_phone text, p_except uuid default null) returns void
language plpgsql stable set search_path = '' as $$
declare last_at timestamptz;
begin
  if exists (select 1 from movematch.phone_cooldown_exempt where phone = p_phone) then return; end if;
  select max(created_at) into last_at from movematch.leads
   where phone = p_phone and created_at > now() - interval '30 days'
     and entry is distinct from 'qa'
     and (p_except is null or id <> p_except);
  if last_at is not null then
    raise exception 'phone_recent'
      using detail = to_char((last_at + interval '30 days') at time zone 'Asia/Jerusalem', 'YYYY-MM-DD');
  end if;
end $$;

create or replace function public.mm_create_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.leads; v_entry text := case when p->>'entry' in ('home', 'qa') then p->>'entry' end;
begin
  if coalesce(length(p->>'name'),0) < 2 or (p->>'phone') !~ '^05\d{8}$' then
    raise exception 'invalid lead';
  end if;
  if v_entry is distinct from 'qa' then
    perform pg_advisory_xact_lock(hashtext('mm_phone:' || (p->>'phone')));
    perform movematch.phone_cooldown_check(p->>'phone');
  end if;
  insert into movematch.leads(variant,status,furthest_step,name,phone,city,move_from,move_to,video_skipped,utm_source,utm_medium,utm_campaign,user_agent,theme,entry)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400),
    case when p->>'theme' in ('photo','art') then p->>'theme' end, v_entry)
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $$;

-- Changing the phone on a /qa lead skips the phone rule too.
create or replace function public.mm_update_lead(p_id uuid, p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
  if (p->>'phone') ~ '^05\d{8}$' and exists (
       select 1 from movematch.leads where id = p_id and edit_token = p_token and phone <> p->>'phone'
         and entry is distinct from 'qa') then
    perform pg_advisory_xact_lock(hashtext('mm_phone:' || (p->>'phone')));
    perform movematch.phone_cooldown_check(p->>'phone', p_id);
  end if;
  update movematch.leads set
    updated_at = now(),
    name = coalesce(left(p->>'name',120), name),
    phone = case when (p->>'phone') ~ '^05\d{8}$' then p->>'phone' else phone end,
    city = coalesce(left(p->>'city',80), city),
    move_from = coalesce(p->'move_from', move_from),
    move_to = coalesce(p->'move_to', move_to),
    move_when = coalesce(p->'move_when', move_when),
    priority = case when (p->>'priority') ~ '^[1-5]$' then (p->>'priority')::smallint else priority end,
    items = case when jsonb_typeof(p->'items') = 'object' and length((p->'items')::text) < 60000 then p->'items' else items end,
    status = case when p->>'status' in ('partial','complete') then p->>'status' else status end,
    furthest_step = greatest(furthest_step, coalesce((p->>'furthest_step')::int, 0)),
    video_skipped = coalesce((p->>'video_skipped')::boolean, video_skipped),
    videos = case when p ? 'add_video' then videos || jsonb_build_array(p->'add_video') else videos end
  where id = p_id and edit_token = p_token
  returning * into r;
  if r.id is null then raise exception 'not found'; end if;
  return to_jsonb(r) - 'edit_token';
end $$;

-- Mover panel: real movers see neither test leads nor homepage leads (the demo mover sees everything).
create or replace function public.mm_mover_leads() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(movematch.mover_lead_json(l, m, false) order by l.created_at desc)
    from movematch.leads l
    where ((not l.is_test and l.entry is distinct from 'home') or m.is_demo)
      and ((l.status = 'complete' and l.variant <> 'a' and l.created_at > now() - interval '60 days')
       or exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone)))), '[]'::jsonb);
end $$;

-- One lead in the panel: a homepage lead the owner forwarded by hand opens once the mover has made an offer on it.
create or replace function public.mm_mover_lead(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id
    and (not x.is_test or m.is_demo)
    and ((x.status = 'complete' and x.variant <> 'a' and (x.entry is distinct from 'home' or m.is_demo))
      or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone)));
  if l.id is null then return null; end if;
  return movematch.mover_lead_json(l, m, true);
end $$;

create or replace function public.mm_mover_submit_bid(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id and x.status = 'complete' and x.variant <> 'a' and (not x.is_test or m.is_demo)
    and (x.entry is distinct from 'home' or m.is_demo
      or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone)));
  if l.id is null then raise exception 'not found'; end if;
  if exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) and b.booked_at is not null) then
    raise exception 'booked';
  end if;
  return public.mm_submit_bid(l.share_token, (p - 'mover_phone' - 'mover_name') || jsonb_build_object('mover_token', m.token::text));
end $$;

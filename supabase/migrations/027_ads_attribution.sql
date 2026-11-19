-- Google Ads / GA4 attribution on leads (see lib/attribution.ts, lib/qualify.ts and TRACKING.md).
--  gclid / gbraid / wbraid    = Google Ads click ids from the landing URL (first touch, kept for 90 days in the browser)
--  utm_term / utm_content     = the other two UTM fields (utm_source / medium / campaign already existed)
--  landing_path               = first page of the visit (path only, no query string)
--  ga_client_id / ga_session_id = the visitor's GA4 ids (from the _ga cookies), so server-side events
--                               (qualify_lead for F, close_convert_lead) join the same GA4 user and session
--  info_choice                = funnel E: 'video' or 'items' (what the client chose on the info step)
--  qualified_at               = when the lead first met the qualify_lead rules (set once: dedupe for GA4 / Ads)
--  booked_reported_at         = when close_convert_lead was sent for this lead (set once)
-- All columns are nullable and the functions accept the old input unchanged, so the current site keeps working.

alter table movematch.leads
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists landing_path text,
  add column if not exists ga_client_id text,
  add column if not exists ga_session_id text,
  add column if not exists info_choice text check (info_choice in ('video', 'items')),
  add column if not exists qualified_at timestamptz,
  add column if not exists booked_reported_at timestamptz;

create index if not exists leads_gclid on movematch.leads (gclid) where gclid is not null;

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
  insert into movematch.leads(variant,status,furthest_step,name,phone,city,move_from,move_to,video_skipped,utm_source,utm_medium,utm_campaign,user_agent,theme,entry,
    gclid,gbraid,wbraid,utm_term,utm_content,landing_path,ga_client_id,ga_session_id)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400),
    case when p->>'theme' in ('photo','art') then p->>'theme' end, v_entry,
    left(p->>'gclid',200), left(p->>'gbraid',200), left(p->>'wbraid',200), left(p->>'utm_term',200), left(p->>'utm_content',200),
    left(p->>'landing_path',200), left(p->>'ga_client_id',60), left(p->>'ga_session_id',30))
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $$;

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
    videos = case when p ? 'add_video' then videos || jsonb_build_array(p->'add_video') else videos end,
    info_choice = case when p->>'info_choice' in ('video','items') then p->>'info_choice' else info_choice end
  where id = p_id and edit_token = p_token
  returning * into r;
  if r.id is null then raise exception 'not found'; end if;
  return to_jsonb(r) - 'edit_token';
end $$;

-- Set qualified_at / booked_reported_at once. Returns true only for the call that set it, so each lead is reported once.
create or replace function public.mm_lead_mark(p_secret text, p_id uuid, p_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  if p_kind = 'qualified' then
    update movematch.leads set qualified_at = now() where id = p_id and qualified_at is null;
  elsif p_kind = 'booked' then
    update movematch.leads l set booked_reported_at = now() where l.id = p_id and l.booked_reported_at is null
       and exists (select 1 from movematch.bids b where b.lead_id = l.id and b.booked_at is not null);
  else
    raise exception 'kind';
  end if;
  return found;
end $$;

-- One lead's row (for server-side analytics after a booking). Admin only.
create or replace function public.mm_lead_for_tracking(p_secret text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return (select (to_jsonb(l) - 'edit_token') || jsonb_build_object('booked_value',
            (select coalesce(b.final_price, b.price) from movematch.bids b where b.lead_id = l.id and b.booked_at is not null order by b.booked_at limit 1))
            from movematch.leads l where l.id = p_id);
end $$;

-- Rows for the Google Ads offline conversion upload (app/api/ads/conversions): qualified leads and booked moves
-- of real leads (no QA test leads) since p_since. Admin only.
create or replace function public.mm_ads_conversions(p_secret text, p_since timestamptz) returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query
  select jsonb_build_object('kind', 'qualified', 'lead_id', l.id, 'at', l.qualified_at, 'value', null,
           'gclid', l.gclid, 'gbraid', l.gbraid, 'wbraid', l.wbraid, 'phone', l.phone, 'variant', l.variant, 'utm_campaign', l.utm_campaign)
    from movematch.leads l
   where l.qualified_at >= p_since and l.entry is distinct from 'qa' and not coalesce(l.is_test, false)
  union all
  select jsonb_build_object('kind', 'booked', 'lead_id', l.id, 'at', b.booked_at, 'value', coalesce(b.final_price, b.price),
           'gclid', l.gclid, 'gbraid', l.gbraid, 'wbraid', l.wbraid, 'phone', l.phone, 'variant', l.variant, 'utm_campaign', l.utm_campaign)
    from movematch.leads l
    join lateral (select * from movematch.bids b where b.lead_id = l.id and b.booked_at is not null order by b.booked_at limit 1) b on true
   where b.booked_at >= p_since and l.entry is distinct from 'qa' and not coalesce(l.is_test, false);
end $$;

revoke all on function public.mm_lead_mark(text, uuid, text) from public;
revoke all on function public.mm_lead_for_tracking(text, uuid) from public;
revoke all on function public.mm_ads_conversions(text, timestamptz) from public;
grant execute on function public.mm_lead_mark(text, uuid, text) to anon, authenticated;
grant execute on function public.mm_lead_for_tracking(text, uuid) to anon, authenticated;
grant execute on function public.mm_ads_conversions(text, timestamptz) to anon, authenticated;

-- 028: the operator sends a lead to movers by hand from /admin (also an unfinished one), and adds videos to a lead
-- (a video the client sent on WhatsApp, or a file uploaded from /admin).
--
-- leads.admin_sent_at = when the operator sent it. Such a lead is shown to movers (panel, lead page, offers) even when it is
-- unfinished (status 'partial'), from funnel A, or held from movers (entry 'home': homepage / funnel F while they are tested).
-- Test leads (is_test) never reach real movers, as before. The status stays 'partial' for unfinished leads, so the funnel stats
-- and the GA4 / Google Ads conversions (lead_complete, qualify_lead) are unchanged.

alter table movematch.leads add column if not exists admin_sent_at timestamptz;

-- Claim the manual send once (a second press does nothing, so a double click never alerts movers twice).
-- The tender opens for 12 hours, like a completed lead. Returns false when already sent, a test lead, or not found.
create or replace function public.mm_admin_send_to_movers(p_secret text, p_id uuid, p_count int) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.leads set
    admin_sent_at = now(),
    movers_pinged_at = now(),
    movers_pinged_count = coalesce(movers_pinged_count, 0) + greatest(p_count, 0),
    closes_at = coalesce(closes_at, now() + interval '12 hours'),
    updated_at = now()
   where id = p_id and admin_sent_at is null and not is_test;
  return found;
end $$;

-- Add one stored video to a lead (the file is already in the movematch-videos bucket under <lead id>/).
-- `src` = the Twilio media URL of a WhatsApp video, so the same video is never added twice. Returns null when not added.
create or replace function public.mm_admin_add_video(p_secret text, p_id uuid, p_video jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform public.mm_check_admin(p_secret);
  if coalesce(p_video->>'path', '') !~ ('^' || p_id::text || '/[\w.-]+$') then raise exception 'bad path'; end if;
  update movematch.leads l set videos = l.videos || jsonb_build_array(p_video), video_skipped = false, updated_at = now()
   where l.id = p_id and not exists (select 1 from jsonb_array_elements(l.videos) v
     where v->>'path' = p_video->>'path' or (p_video ? 'src' and v->>'src' = p_video->>'src'))
  returning to_jsonb(l) - 'edit_token' into r;
  return r;
end $$;

revoke all on function public.mm_admin_send_to_movers(text, uuid, int), public.mm_admin_add_video(text, uuid, jsonb) from public, authenticated;
grant execute on function public.mm_admin_send_to_movers(text, uuid, int), public.mm_admin_add_video(text, uuid, jsonb) to anon;

-- Mover JSON: also the status and whether the operator sent it, so mover pages can say which details are still missing.
create or replace function movematch.mover_lead_json(l movematch.leads, m movematch.movers, p_full boolean)
 returns jsonb language sql stable set search_path to '' as $function$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'share_token', l.share_token, 'created_at', l.created_at,
    'closes_at', l.closes_at, 'now', now(),
    'open', case when l.closes_at is not null then l.closes_at > now() else l.created_at > now() - interval '7 days' end,
    'status', l.status, 'admin_sent', l.admin_sent_at is not null,
    'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'move_when', l.move_when,
    'videos', case when p_full then l.videos else to_jsonb(jsonb_array_length(l.videos)) end,
    'video_skipped', l.video_skipped,
    'items', case when p_full then l.items else to_jsonb(coalesce((select sum((i->>'qty')::int) from jsonb_array_elements(l.items->'list') i), 0)) end,
    'priority', l.priority,
    'bid_count', (select count(*) from movematch.bids x where x.lead_id = l.id and not x.hidden),
    'client', case when p_full then jsonb_build_object('name', l.name, 'phone', l.phone) end,
    'my_bid', (select to_jsonb(b) - 'mover_phone' - 'hidden' from movematch.bids b
                where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) order by b.updated_at desc limit 1))
$function$;

-- Mover panel list: + leads the operator sent by hand.
create or replace function public.mm_mover_leads()
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(movematch.mover_lead_json(l, m, false) order by l.created_at desc)
    from movematch.leads l
    where ((not l.is_test and (l.entry is distinct from 'home' or l.admin_sent_at is not null)) or m.is_demo)
      and ((l.status = 'complete' and l.variant <> 'a' and l.created_at > now() - interval '60 days')
       or (l.admin_sent_at is not null and l.admin_sent_at > now() - interval '60 days')
       or exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone)))), '[]'::jsonb);
end $function$;

-- One lead in the mover panel: + leads the operator sent by hand.
create or replace function public.mm_mover_lead(p_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id
    and (not x.is_test or m.is_demo)
    and ((x.status = 'complete' and x.variant <> 'a' and (x.entry is distinct from 'home' or m.is_demo))
      or x.admin_sent_at is not null
      or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone)));
  if l.id is null then return null; end if;
  return movematch.mover_lead_json(l, m, true);
end $function$;

-- Offer from the mover panel: + leads the operator sent by hand.
create or replace function public.mm_mover_submit_bid(p_id uuid, p jsonb)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id and (not x.is_test or m.is_demo)
    and ((x.status = 'complete' and x.variant <> 'a'
          and (x.entry is distinct from 'home' or m.is_demo
            or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone))))
      or x.admin_sent_at is not null);
  if l.id is null then raise exception 'not found'; end if;
  if exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) and b.booked_at is not null) then
    raise exception 'booked';
  end if;
  return public.mm_submit_bid(l.share_token, (p - 'mover_phone' - 'mover_name') || jsonb_build_object('mover_token', m.token::text));
end $function$;

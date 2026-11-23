-- 029: the English site (/en). Leads from it are saved with lang = 'en' (null = Hebrew site / WhatsApp chat in Hebrew).
--  * mm_create_lead saves p->>'lang' ('en' only).
--  * mm_client_tender returns 'lang', so /t/<code> forwards English clients to /en/t/<code>.
--  * mm_public_lead (/l/<token>, the mover's lead page) and movematch.mover_lead_json (mover panel) return 'lang',
--    so movers see that the client speaks English. mm_admin_lead / mm_update_lead return the whole row, so they have it too.
-- Everything else is unchanged from 027 / 019 / the current definitions.

alter table movematch.leads add column if not exists lang text check (lang in ('en'));

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
    gclid,gbraid,wbraid,utm_term,utm_content,landing_path,ga_client_id,ga_session_id,lang)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400),
    case when p->>'theme' in ('photo','art') then p->>'theme' end, v_entry,
    left(p->>'gclid',200), left(p->>'gbraid',200), left(p->>'wbraid',200), left(p->>'utm_term',200), left(p->>'utm_content',200),
    left(p->>'landing_path',200), left(p->>'ga_client_id',60), left(p->>'ga_session_id',30),
    case when p->>'lang' = 'en' then 'en' end)
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $$;

create or replace function public.mm_client_tender(p_code text)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'created_at', l.created_at, 'status', l.status, 'variant', l.variant,
    'name', split_part(l.name, ' ', 1), 'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to,
    'move_when', l.move_when, 'videos', jsonb_array_length(l.videos), 'video_skipped', l.video_skipped,
    'closes_at', l.closes_at, 'now', now(),
    'offers', movematch.client_offers_json(l.id),
    'resume', case when l.status = 'partial' then jsonb_build_object('id', l.id, 'token', l.edit_token, 'name', l.name, 'phone', l.phone, 'city', l.city) end,
    'upload', case when l.status = 'complete' then jsonb_build_object('id', l.id, 'token', l.edit_token) end,
    'lang', l.lang)
  from movematch.leads l where l.client_code = lower(p_code);
$function$;

create or replace function public.mm_public_lead(p_token uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'id', l.id, 'tender_no', l.tender_no, 'created_at', l.created_at, 'status', l.status, 'variant', l.variant,
    'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'move_when', l.move_when,
    'videos', l.videos, 'video_skipped', l.video_skipped, 'closes_at', l.closes_at, 'now', now(), 'items', l.items,
    'lang', l.lang)
  from movematch.leads l where l.share_token = p_token;
$function$;

create or replace function movematch.mover_lead_json(l movematch.leads, m movematch.movers, p_full boolean)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
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
                where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) order by b.updated_at desc limit 1),
    'lang', l.lang)
$function$;

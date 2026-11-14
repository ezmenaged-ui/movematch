-- 019: clients can add a video to a finished tender from their tender page (/t/<code>).
-- mm_client_tender now also returns 'upload' (lead id + edit token) for finished tenders, so the page can link to the
-- phone upload screen (/u/<id>?k=<token>&t=<code>). The client code already unlocks the tender page, and for unfinished
-- tenders the same id + token were already returned as 'resume'.

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
    'upload', case when l.status = 'complete' then jsonb_build_object('id', l.id, 'token', l.edit_token) end)
  from movematch.leads l where l.client_code = lower(p_code);
$function$;

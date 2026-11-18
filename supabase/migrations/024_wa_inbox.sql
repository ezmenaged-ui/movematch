-- WhatsApp inbox: every message to/from the business number, so the operator can see it and reply.
--  dir 'in'  = a customer/mover wrote to the business number
--  dir 'out' = our reply to them (from the operator's WhatsApp relay or from /admin/inbox)
--  dir 'op'  = the operator wrote to the business number (only used to know the operator's own 24h window)
-- alert_sid = Twilio SID of the WhatsApp alert we sent the operator about an 'in' message. When the operator
-- replies to that alert in WhatsApp, Twilio gives us OriginalRepliedMessageSid = alert_sid → we know whom to answer.
-- media = [{ url: Twilio media URL, type: content type }]. Files stay on Twilio; the site shows them via a signed proxy.

create table if not exists movematch.wa_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  phone text not null,                 -- digits, international (972501234567)
  name text,
  dir text not null check (dir in ('in', 'out', 'op')),
  body text not null default '',
  media jsonb not null default '[]'::jsonb,
  sid text unique,                     -- Twilio SID of this message
  alert_sid text unique,               -- Twilio SID of the operator alert about it ('in' only)
  status text,                         -- Twilio delivery status ('out' only): queued/sent/delivered/read/failed/undelivered
  error text,
  via text                             -- 'out': 'whatsapp' (operator replied in WhatsApp) or 'admin'
);
create index if not exists wa_messages_phone_at on movematch.wa_messages (phone, created_at desc);
create index if not exists wa_messages_dir_at on movematch.wa_messages (dir, created_at desc);
alter table movematch.wa_messages enable row level security; -- no policies: only the security-definer functions below

create or replace function movematch.wa_digits(p text) returns text language sql immutable set search_path = '' as $$
  select case when d ~ '^0' then '972' || substr(d, 2) else d end from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') d) x;
$$;

-- State of a conversation before saving a new message (used by the inbound webhook).
create or replace function public.mm_inbox_state(p_secret text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v text := movematch.wa_digits(p_phone);
begin
  perform public.mm_check_admin(p_secret);
  return jsonb_build_object(
    'last_in',    (select max(created_at) from movematch.wa_messages where phone = v and dir = 'in'),
    'last_any',   (select max(created_at) from movematch.wa_messages where phone = v and dir in ('in', 'out')),
    'last_alert', (select max(created_at) from movematch.wa_messages where phone = v and dir = 'in' and alert_sid is not null),
    'op_last',    (select max(created_at) from movematch.wa_messages where dir = 'op'));
end $$;

create or replace function public.mm_inbox_add(p_secret text, p_phone text, p_name text, p_dir text, p_body text, p_media jsonb, p_sid text, p_via text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.mm_check_admin(p_secret);
  insert into movematch.wa_messages(phone, name, dir, body, media, sid, via, status)
  values (movematch.wa_digits(p_phone), nullif(left(coalesce(p_name, ''), 120), ''), p_dir, left(coalesce(p_body, ''), 4000),
          coalesce(p_media, '[]'::jsonb), nullif(p_sid, ''), nullif(p_via, ''), case when p_dir = 'out' then 'queued' end)
  on conflict (sid) do nothing   -- Twilio retried the webhook: keep one copy
  returning id into v_id;
  -- 'op' rows only matter for "when did the operator last write": keep the last 2 days.
  delete from movematch.wa_messages where dir = 'op' and created_at < now() - interval '2 days';
  return v_id;                   -- null when it was a duplicate
end $$;

create or replace function public.mm_inbox_set_alert(p_secret text, p_id uuid, p_alert_sid text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  update movematch.wa_messages set alert_sid = nullif(p_alert_sid, '') where id = p_id;
end $$;

-- Delivery status of our replies (from /api/twilio/status). Never downgrades read → delivered.
create or replace function public.mm_inbox_set_status(p_secret text, p_sid text, p_status text, p_error text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.wa_messages;
begin
  perform public.mm_check_admin(p_secret);
  update movematch.wa_messages set
    status = case when status = 'read' and p_status in ('sent', 'delivered') then status
                  when status = 'delivered' and p_status = 'sent' then status else left(p_status, 20) end,
    error = coalesce(nullif(p_error, ''), error)
  where sid = p_sid and dir = 'out' returning * into r;
  return case when r.id is null then null else jsonb_build_object('phone', r.phone, 'name', r.name, 'body', r.body, 'via', r.via) end;
end $$;

-- Operator replied to an alert in WhatsApp: who was that alert about?
create or replace function public.mm_inbox_by_alert(p_secret text, p_alert_sid text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r movematch.wa_messages;
begin
  perform public.mm_check_admin(p_secret);
  select * into r from movematch.wa_messages where alert_sid = p_alert_sid;
  if r.id is null then return null; end if;
  return jsonb_build_object('phone', r.phone, 'name', (select name from movematch.wa_messages
    where phone = r.phone and dir = 'in' and name is not null order by created_at desc limit 1),
    'last_in', (select max(created_at) from movematch.wa_messages where phone = r.phone and dir = 'in'));
end $$;

-- Conversation list for /admin/inbox: one row per phone, newest first.
create or replace function public.mm_inbox_list(p_secret text) returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query
  select jsonb_build_object('phone', t.phone, 'name', t.name, 'last_at', t.last_at, 'last_in', t.last_in,
    'last_dir', t.last_dir, 'last_body', t.last_body, 'last_media', t.last_media, 'n', t.n)
  from (
    select m.phone,
      (select name from movematch.wa_messages x where x.phone = m.phone and x.dir = 'in' and x.name is not null order by created_at desc limit 1) as name,
      max(m.created_at) as last_at,
      max(m.created_at) filter (where m.dir = 'in') as last_in,
      (array_agg(m.dir order by m.created_at desc))[1] as last_dir,
      (array_agg(m.body order by m.created_at desc))[1] as last_body,
      (array_agg(jsonb_array_length(m.media) order by m.created_at desc))[1] as last_media,
      count(*) as n
    from movematch.wa_messages m where m.dir in ('in', 'out') group by m.phone
  ) t order by t.last_at desc limit 300;
end $$;

create or replace function public.mm_inbox_thread(p_secret text, p_phone text) returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query
  select to_jsonb(m) - 'alert_sid' from movematch.wa_messages m
  where m.phone = movematch.wa_digits(p_phone) and m.dir in ('in', 'out') order by m.created_at limit 1000;
end $$;

revoke all on function movematch.wa_digits(text) from public, anon, authenticated;
grant execute on function public.mm_inbox_state(text, text), public.mm_inbox_add(text, text, text, text, text, jsonb, text, text),
  public.mm_inbox_set_alert(text, uuid, text), public.mm_inbox_set_status(text, text, text, text),
  public.mm_inbox_by_alert(text, text), public.mm_inbox_list(text), public.mm_inbox_thread(text, text) to anon;

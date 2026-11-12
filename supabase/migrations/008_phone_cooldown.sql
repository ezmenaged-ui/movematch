-- One tender per phone number per 30 days (across all tenders).
-- A blocked attempt raises 'phone_recent'; DETAIL carries the date (YYYY-MM-DD, Israel time) the number may open a new tender.

create index if not exists leads_phone_created_idx on movematch.leads (phone, created_at desc);

-- Test numbers that skip the rule. Add/remove rows in the Supabase table editor.
create table if not exists movematch.phone_cooldown_exempt (
  phone text primary key check (phone ~ '^05\d{8}$'),
  note text,
  created_at timestamptz not null default now()
);
alter table movematch.phone_cooldown_exempt enable row level security;

create or replace function movematch.phone_cooldown_check(p_phone text, p_except uuid default null) returns void
language plpgsql stable set search_path = '' as $$
declare last_at timestamptz;
begin
  if exists (select 1 from movematch.phone_cooldown_exempt where phone = p_phone) then return; end if;
  select max(created_at) into last_at from movematch.leads
   where phone = p_phone and created_at > now() - interval '30 days'
     and (p_except is null or id <> p_except);
  if last_at is not null then
    raise exception 'phone_recent'
      using detail = to_char((last_at + interval '30 days') at time zone 'Asia/Jerusalem', 'YYYY-MM-DD');
  end if;
end $$;

create or replace function public.mm_create_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
  if coalesce(length(p->>'name'),0) < 2 or (p->>'phone') !~ '^05\d{8}$' then
    raise exception 'invalid lead';
  end if;
  -- Serialise per phone so two parallel submits can't both slip through.
  perform pg_advisory_xact_lock(hashtext('mm_phone:' || (p->>'phone')));
  perform movematch.phone_cooldown_check(p->>'phone');
  insert into movematch.leads(variant,status,furthest_step,name,phone,city,move_from,move_to,video_skipped,utm_source,utm_medium,utm_campaign,user_agent)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400))
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $$;

-- Changing the phone on an existing lead (e.g. going back in the wizard) is subject to the same rule.
create or replace function public.mm_update_lead(p_id uuid, p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
  if (p->>'phone') ~ '^05\d{8}$' and exists (
       select 1 from movematch.leads where id = p_id and edit_token = p_token and phone <> p->>'phone') then
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
    status = case when p->>'status' in ('partial','complete') then p->>'status' else status end,
    furthest_step = greatest(furthest_step, coalesce((p->>'furthest_step')::int, 0)),
    video_skipped = coalesce((p->>'video_skipped')::boolean, video_skipped),
    videos = case when p ? 'add_video' then videos || jsonb_build_array(p->'add_video') else videos end
  where id = p_id and edit_token = p_token
  returning * into r;
  if r.id is null then raise exception 'not found'; end if;
  return to_jsonb(r) - 'edit_token';
end $$;

-- Seed the owner's test number (matched from existing leads so the full number isn't written here).
insert into movematch.phone_cooldown_exempt(phone, note)
select phone, 'owner test number' from movematch.leads where phone like '054%7361' group by phone
on conflict do nothing;

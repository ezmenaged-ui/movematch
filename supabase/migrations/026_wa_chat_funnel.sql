-- Funnel F: the whole funnel as a WhatsApp chat (Google Ads "message asset" → WhatsApp → bot asks the funnel questions).
-- See lib/waFunnel.ts. One row per phone number while a chat funnel is running.
--  step   = the question the bot is waiting for ('from' | 'to' | 'when' | 'video' | 'name' | 'done')
--  data   = answers so far ({ from: Address, to: Address, when: When, ask: field last asked, video_refusals, ... })
--  source = ad-group code from the starter message (e.g. 'G1' from "... #G1"), saved on the lead as utm_campaign
--  status = 'active' (bot answers) | 'done' (lead complete) | 'handoff' (customer asked for a person) | 'stopped' (הסר)
--  locked_until = short lease so two messages sent together (text + video) are handled one after the other

alter table movematch.leads drop constraint if exists leads_variant_check;
alter table movematch.leads add constraint leads_variant_check
  check (variant in ('a', 'wizard', 'form', 'items', 'choice', 'chat'));

create table if not exists movematch.wa_funnel (
  phone text primary key,                       -- digits, international (972501234567)
  lead_id uuid references movematch.leads(id) on delete set null,
  lead_token uuid,
  step text not null default 'from',
  data jsonb not null default '{}'::jsonb,
  source text,
  test boolean not null default false,
  status text not null default 'active' check (status in ('active', 'done', 'handoff', 'stopped')),
  started_at timestamptz not null default now(),
  last_in timestamptz not null default now(),   -- customer's last message (the 24h WhatsApp window runs from here)
  reminders smallint not null default 0,        -- reminders sent in this chat (max 2)
  next_reminder_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists wa_funnel_reminder on movematch.wa_funnel (next_reminder_at) where status = 'active';
alter table movematch.wa_funnel enable row level security; -- no policies: only the security-definer functions below

create or replace function public.mm_wa_funnel_get(p_secret text, p_phone text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return (select to_jsonb(f) from movematch.wa_funnel f where f.phone = movematch.wa_digits(p_phone));
end $$;

-- Take the per-phone lease (30 s). Returns false while another request for this phone holds it.
create or replace function public.mm_wa_funnel_lock(p_secret text, p_phone text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.mm_check_admin(p_secret);
  update movematch.wa_funnel set locked_until = now() + interval '30 seconds'
   where phone = movematch.wa_digits(p_phone) and (locked_until is null or locked_until < now());
  get diagnostics n = row_count;
  return n > 0 or not exists (select 1 from movematch.wa_funnel where phone = movematch.wa_digits(p_phone));
end $$;

-- Create or update the chat state. Keys present in p overwrite; p.reset = true starts a new chat on this phone.
-- Always releases the lease.
create or replace function public.mm_wa_funnel_save(p_secret text, p_phone text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text := movematch.wa_digits(p_phone); r movematch.wa_funnel;
begin
  perform public.mm_check_admin(p_secret);
  if coalesce((p->>'reset')::boolean, false) then delete from movematch.wa_funnel where phone = v; end if;
  insert into movematch.wa_funnel (phone) values (v) on conflict (phone) do nothing;
  update movematch.wa_funnel set
    lead_id          = case when p ? 'lead_id' then (p->>'lead_id')::uuid else lead_id end,
    lead_token       = case when p ? 'lead_token' then (p->>'lead_token')::uuid else lead_token end,
    step             = coalesce(p->>'step', step),
    data             = case when jsonb_typeof(p->'data') = 'object' and length((p->'data')::text) < 30000 then p->'data' else data end,
    source           = case when p ? 'source' then left(p->>'source', 40) else source end,
    test             = coalesce((p->>'test')::boolean, test),
    status           = coalesce(p->>'status', status),
    last_in          = coalesce((p->>'last_in')::timestamptz, last_in),
    reminders        = coalesce((p->>'reminders')::smallint, reminders),
    next_reminder_at = case when p ? 'next_reminder_at' then (p->>'next_reminder_at')::timestamptz else next_reminder_at end,
    locked_until     = null,
    updated_at       = now()
  where phone = v
  returning * into r;
  return to_jsonb(r);
end $$;

-- Reminders that are due: claimed (next_reminder_at cleared, reminders + 1) so each goes out once.
create or replace function public.mm_wa_funnel_claim_reminders(p_secret text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query
    update movematch.wa_funnel f set next_reminder_at = null, reminders = f.reminders + 1, updated_at = now()
     where f.status = 'active' and f.next_reminder_at <= now() and f.reminders < 2
       and (f.locked_until is null or f.locked_until < now())
    returning to_jsonb(f);
end $$;

revoke all on function public.mm_wa_funnel_get(text, text) from public;
revoke all on function public.mm_wa_funnel_lock(text, text) from public;
revoke all on function public.mm_wa_funnel_save(text, text, jsonb) from public;
revoke all on function public.mm_wa_funnel_claim_reminders(text) from public;
grant execute on function public.mm_wa_funnel_get(text, text) to anon, authenticated;
grant execute on function public.mm_wa_funnel_lock(text, text) to anon, authenticated;
grant execute on function public.mm_wa_funnel_save(text, text, jsonb) to anon, authenticated;
grant execute on function public.mm_wa_funnel_claim_reminders(text) to anon, authenticated;

-- Reminder sender: every 5 minutes (the route only sends what is due; 20:30 and 10:00 Israel time).
select cron.schedule('mm-wa-funnel', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://movematch.co.il/api/cron/wa-funnel',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mm-cron', (select value from movematch.settings where key = 'admin_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);

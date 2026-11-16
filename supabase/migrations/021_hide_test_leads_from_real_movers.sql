-- Test leads show only in the demo mover login, never to real movers.
-- Before this, every mover's panel listed every completed lead of the last 60 days, test leads included.

alter table movematch.leads add column if not exists is_test boolean not null default false;
alter table movematch.movers add column if not exists is_demo boolean not null default false;

-- A lead is a test lead when its name starts with "QA", it came with ?utm_source=qa (same rule as lib/qa.ts),
-- or it uses the owner's phone 054-6677361. Once marked, it stays marked (manual marks are kept).
create or replace function movematch.mark_test_lead() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.is_test := new.is_test
    or coalesce(new.name, '') ~* '^\s*QA\M'
    or lower(trim(coalesce(new.utm_source, ''))) = 'qa'
    or regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') in ('0546677361', '972546677361');
  return new;
end $$;

drop trigger if exists leads_mark_test on movematch.leads;
create trigger leads_mark_test before insert or update of name, phone, utm_source, is_test on movematch.leads
  for each row execute function movematch.mark_test_lead();

-- Panel: real movers see real leads only; the demo mover sees everything.
create or replace function public.mm_mover_leads() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(movematch.mover_lead_json(l, m, false) order by l.created_at desc)
    from movematch.leads l
    where (not l.is_test or m.is_demo)
      and ((l.status = 'complete' and l.variant <> 'a' and l.created_at > now() - interval '60 days')
       or exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone)))), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_lead(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads x where x.id = p_id
    and (not x.is_test or m.is_demo)
    and ((x.status = 'complete' and x.variant <> 'a')
      or exists (select 1 from movematch.bids b where b.lead_id = x.id and (b.mover_id = m.id or b.mover_phone = m.phone)));
  if l.id is null then return null; end if;
  return movematch.mover_lead_json(l, m, true);
end $$;

create or replace function public.mm_mover_submit_bid(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); l movematch.leads;
begin
  select * into l from movematch.leads where id = p_id and status = 'complete' and variant <> 'a' and (not is_test or m.is_demo);
  if l.id is null then raise exception 'not found'; end if;
  if exists (select 1 from movematch.bids b where b.lead_id = l.id and (b.mover_id = m.id or b.mover_phone = m.phone) and b.booked_at is not null) then
    raise exception 'booked';
  end if;
  return public.mm_submit_bid(l.share_token, (p - 'mover_phone' - 'mover_name') || jsonb_build_object('mover_token', m.token::text));
end $$;

-- Data (16 Nov 2026): the demo login, and the test leads that existed then.
update movematch.movers set is_demo = true where id = 'e32f1c4c-dac8-4011-a283-745fcf36a997'; -- הובלות הדגמה (MoveMatch)
update movematch.leads set is_test = is_test;                                                  -- runs the trigger rule on every lead
update movematch.leads set is_test = true where tender_no = 285111;                            -- "ניקול": fake, confirmed by the owner

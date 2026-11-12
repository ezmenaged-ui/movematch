-- 014: Mover crew (employees), manual calendar jobs, crew assignment, and a token job sheet for the crew.

create table if not exists movematch.mover_crew (
  id uuid primary key default gen_random_uuid(),
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  lang text not null default 'he' check (lang in ('he', 'ru')),
  created_at timestamptz not null default now()
);
alter table movematch.mover_crew enable row level security;

create table if not exists movematch.mover_jobs (
  id uuid primary key default gen_random_uuid(),
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  from_text text not null default '',
  to_text text not null default '',
  items_text text not null default '',
  notes text not null default '',
  crew_ids uuid[] not null default '{}',
  sheet_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table movematch.mover_jobs enable row level security;

alter table movematch.bids
  add column if not exists job_end_time time,
  add column if not exists crew_ids uuid[] not null default '{}',
  add column if not exists sheet_token uuid not null default gen_random_uuid();
create unique index if not exists bids_sheet_token_key on movematch.bids(sheet_token);

revoke all on movematch.mover_crew, movematch.mover_jobs from anon, authenticated;

-- Keep only crew ids that belong to this mover.
create or replace function movematch.own_crew(p_mover uuid, p_ids uuid[]) returns uuid[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(c.id order by c.created_at), '{}') from movematch.mover_crew c where c.mover_id = p_mover and c.id = any(coalesce(p_ids, '{}'));
$$;
revoke all on function movematch.own_crew(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.mm_mover_crew() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(to_jsonb(c) - 'mover_id' order by c.created_at) from movematch.mover_crew c where c.mover_id = m.id), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_save_crew(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); v_id uuid := nullif(p->>'id','')::uuid; v_phone text := regexp_replace(coalesce(p->>'phone',''), '\D', '', 'g');
begin
  if coalesce(trim(p->>'full_name'), '') = '' then raise exception 'name required'; end if;
  if v_phone ~ '^972' then v_phone := '0' || substr(v_phone, 4); end if;
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if v_id is null then
    if (select count(*) from movematch.mover_crew where mover_id = m.id) >= 100 then raise exception 'too many'; end if;
    insert into movematch.mover_crew(mover_id, full_name, email, phone, lang)
    values (m.id, left(trim(p->>'full_name'), 120), nullif(left(trim(coalesce(p->>'email','')), 120), ''), v_phone, case when p->>'lang' = 'ru' then 'ru' else 'he' end)
    returning id into v_id;
  else
    update movematch.mover_crew set full_name = left(trim(p->>'full_name'), 120), email = nullif(left(trim(coalesce(p->>'email','')), 120), ''),
      phone = v_phone, lang = case when p->>'lang' = 'ru' then 'ru' else 'he' end
    where id = v_id and mover_id = m.id returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.mm_mover_delete_crew(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  delete from movematch.mover_crew where id = p_id and mover_id = m.id;
  update movematch.mover_jobs set crew_ids = array_remove(crew_ids, p_id) where mover_id = m.id;
  update movematch.bids set crew_ids = array_remove(crew_ids, p_id) where (mover_id = m.id or mover_phone = m.phone) and p_id = any(crew_ids);
end $$;

create or replace function public.mm_mover_jobs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  return coalesce((select jsonb_agg(to_jsonb(j) - 'mover_id' order by j.date, j.start_time) from movematch.mover_jobs j where j.mover_id = m.id), '[]'::jsonb);
end $$;

create or replace function public.mm_mover_save_job(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); v_id uuid := nullif(p->>'id','')::uuid;
  v_crew uuid[] := movematch.own_crew(m.id, (select coalesce(array_agg(x::uuid), '{}') from jsonb_array_elements_text(coalesce(p->'crew_ids','[]'::jsonb)) x));
  v_date date := (p->>'date')::date; v_st time := nullif(p->>'start_time','')::time; v_et time := nullif(p->>'end_time','')::time;
begin
  if coalesce(trim(p->>'title'), '') = '' then raise exception 'title required'; end if;
  if v_st is not null and v_et is not null and v_et <= v_st then raise exception 'bad hours'; end if;
  if v_id is null then
    insert into movematch.mover_jobs(mover_id, title, date, start_time, end_time, from_text, to_text, items_text, notes, crew_ids)
    values (m.id, left(trim(p->>'title'), 120), v_date, v_st, v_et, left(coalesce(p->>'from_text',''), 300), left(coalesce(p->>'to_text',''), 300),
      left(coalesce(p->>'items_text',''), 3000), left(coalesce(p->>'notes',''), 1000), v_crew)
    returning id into v_id;
  else
    update movematch.mover_jobs set title = left(trim(p->>'title'), 120), date = v_date, start_time = v_st, end_time = v_et,
      from_text = left(coalesce(p->>'from_text',''), 300), to_text = left(coalesce(p->>'to_text',''), 300),
      items_text = left(coalesce(p->>'items_text',''), 3000), notes = left(coalesce(p->>'notes',''), 1000), crew_ids = v_crew, updated_at = now()
    where id = v_id and mover_id = m.id returning id into v_id;
    if v_id is null then raise exception 'not found'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.mm_mover_delete_job(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me();
begin
  delete from movematch.mover_jobs where id = p_id and mover_id = m.id;
end $$;

-- Book a MoveMatch job with hours and crew (replaces mm_mover_book for the panel; p_date null = unbook).
create or replace function public.mm_mover_book_job(p_bid uuid, p_date date, p_start time, p_end time, p_crew uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); b movematch.bids;
begin
  if p_start is not null and p_end is not null and p_end <= p_start then raise exception 'bad hours'; end if;
  update movematch.bids set
    booked_at = case when p_date is null then null else coalesce(booked_at, now()) end,
    job_date = p_date, job_time = case when p_date is null then null else p_start end,
    job_end_time = case when p_date is null then null else p_end end,
    crew_ids = case when p_date is null then '{}' else movematch.own_crew(m.id, p_crew) end,
    job_done_at = case when p_date is null then null else job_done_at end, updated_at = now()
  where id = p_bid and (mover_id = m.id or mover_phone = m.phone) returning * into b;
  if b.id is null then raise exception 'not found'; end if;
  return to_jsonb(b) - 'mover_phone';
end $$;

-- Crew job sheet by its secret token (link in the crew WhatsApp message). No login.
create or replace function public.mm_job_sheet(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare j movematch.mover_jobs; b movematch.bids; l movematch.leads; m movematch.movers;
begin
  select * into j from movematch.mover_jobs where sheet_token = p_token;
  if j.id is not null then
    select * into m from movematch.movers where id = j.mover_id;
    return jsonb_build_object('kind', 'manual', 'company', coalesce(nullif(m.company_name,''), m.name), 'title', j.title, 'date', j.date,
      'start_time', to_char(j.start_time, 'HH24:MI'), 'end_time', to_char(j.end_time, 'HH24:MI'),
      'from_text', j.from_text, 'to_text', j.to_text, 'items_text', j.items_text, 'notes', j.notes,
      'crew', (select coalesce(jsonb_agg(c.full_name order by c.created_at), '[]') from movematch.mover_crew c where c.id = any(j.crew_ids)));
  end if;
  select * into b from movematch.bids where sheet_token = p_token and booked_at is not null;
  if b.id is null then return null; end if;
  select * into l from movematch.leads where id = b.lead_id;
  select * into m from movematch.movers where id = b.mover_id or (b.mover_id is null and phone = b.mover_phone) limit 1;
  return jsonb_build_object('kind', 'lead', 'company', coalesce(nullif(m.company_name,''), m.name, b.mover_name), 'tender_no', l.tender_no,
    'date', b.job_date, 'start_time', to_char(b.job_time, 'HH24:MI'), 'end_time', to_char(b.job_end_time, 'HH24:MI'),
    'city', l.city, 'move_from', l.move_from, 'move_to', l.move_to, 'items', l.items, 'note', b.note,
    'client', jsonb_build_object('name', l.name, 'phone', l.phone),
    'crew', (select coalesce(jsonb_agg(c.full_name order by c.created_at), '[]') from movematch.mover_crew c where c.id = any(b.crew_ids)));
end $$;

grant execute on function public.mm_mover_crew(), public.mm_mover_save_crew(jsonb), public.mm_mover_delete_crew(uuid), public.mm_mover_jobs(),
  public.mm_mover_save_job(jsonb), public.mm_mover_delete_job(uuid), public.mm_mover_book_job(uuid, date, time, time, uuid[]) to authenticated;
revoke execute on function public.mm_mover_crew(), public.mm_mover_save_crew(jsonb), public.mm_mover_delete_crew(uuid), public.mm_mover_jobs(),
  public.mm_mover_save_job(jsonb), public.mm_mover_delete_job(uuid), public.mm_mover_book_job(uuid, date, time, time, uuid[]) from public, anon;
grant execute on function public.mm_job_sheet(uuid) to anon, authenticated;

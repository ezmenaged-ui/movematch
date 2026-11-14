-- 013: mover service areas (required at sign-up) → tender routing by the lead's origin area.
-- Applied to production on 14 Nov 2026. Safe to re-run. Does not change any existing function.
-- The area list must match AREAS in lib/areas.ts.

create table if not exists movematch.mover_service_areas (
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  area text not null check (area in ('ירושלים והסביבה','מרכז','השרון','שפלה','צפון','חיפה והקריות','דרום','באר שבע והנגב','יהודה ושומרון','אילת')),
  created_at timestamptz not null default now(),
  primary key (mover_id, area)
);
alter table movematch.mover_service_areas enable row level security; -- no policies: access only through the functions below

-- Clean list: known areas only, no repeats.
create or replace function public.mm_clean_areas(p_areas text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct a), '{}') from unnest(coalesce(p_areas, '{}')) a
   where a in ('ירושלים והסביבה','מרכז','השרון','שפלה','צפון','חיפה והקריות','דרום','באר שבע והנגב','יהודה ושומרון','אילת');
$$;

-- Public sign-up with areas: same as mm_mover_signup (which it calls, unchanged), plus at least one service area.
-- All in one transaction: a sign-up without areas is not saved.
create or replace function public.mm_mover_signup_v2(p jsonb, p_logo text, p_areas text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare a text[] := public.mm_clean_areas(p_areas); mid uuid;
begin
  if cardinality(a) = 0 then raise exception 'areas'; end if;
  mid := (public.mm_mover_signup(p, p_logo)->>'id')::uuid;
  if mid is null then raise exception 'signup failed'; end if;
  insert into movematch.mover_service_areas(mover_id, area) select mid, x from unnest(a) x on conflict do nothing;
end $$;

-- Admin: areas of every mover → [{mover_id, areas}]
create or replace function public.mm_admin_mover_areas(p_secret text) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return query select jsonb_build_object('mover_id', s.mover_id, 'areas', array_agg(s.area order by s.area))
    from movematch.mover_service_areas s group by s.mover_id;
end $$;

-- Admin: replace a mover's areas.
create or replace function public.mm_admin_set_mover_areas(p_secret text, p_id uuid, p_areas text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare a text[] := public.mm_clean_areas(p_areas);
begin
  perform public.mm_check_admin(p_secret);
  delete from movematch.mover_service_areas where mover_id = p_id and not (area = any(a));
  insert into movematch.mover_service_areas(mover_id, area) select p_id, x from unnest(a) x on conflict do nothing;
end $$;

revoke all on function public.mm_clean_areas(text[]), public.mm_mover_signup_v2(jsonb,text,text[]),
  public.mm_admin_mover_areas(text), public.mm_admin_set_mover_areas(text,uuid,text[]) from public, authenticated;
grant execute on function public.mm_mover_signup_v2(jsonb,text,text[]),
  public.mm_admin_mover_areas(text), public.mm_admin_set_mover_areas(text,uuid,text[]) to anon;

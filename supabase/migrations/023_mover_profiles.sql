-- 023: Public mover profiles (/our-movers, /our-movers/<slug>) + "show phone" log.
--
-- movers.slug            URL name of the public profile (a-z, 0-9, dashes).
-- movers.profile_public  the admin's switch. A profile is shown only when it is on AND the mover is active, approved and not a demo.
-- movers.profile         jsonb, all keys optional:
--   tagline, people, people_role, intro, about (paragraphs split by a blank line), years (int), founded (int),
--   facts [{label, value}], services [text], promises [{title, text}], testimonials [{name, place, text, source}],
--   extra_ratings [{label, score, out_of, reviews, url}], website, instagram, facebook, public_phone, rank (int, lower = first).
-- status 'prospect'      a company we wrote a profile for before it joined. Never active, never gets leads, never shown.
--                        When it signs up with the same phone, the sign-up fills that row (profile kept) and it becomes 'pending'.
-- mover_reveals          a client typed name + phone to see a mover's number. Used to attribute direct deals to MoveMatch.
--                        Nothing is sent to anyone on a reveal.

alter table movematch.movers drop constraint if exists movers_status_check;
alter table movematch.movers add constraint movers_status_check check (status in ('pending', 'approved', 'prospect'));

alter table movematch.movers
  add column if not exists slug text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 40),
  add column if not exists profile jsonb not null default '{}'::jsonb check (pg_column_size(profile) < 60000),
  add column if not exists profile_public boolean not null default false;

create table if not exists movematch.mover_reveals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mover_id uuid not null references movematch.movers(id) on delete cascade,
  name text not null,
  phone text not null check (phone ~ '^05\d{8}$'),
  utm_source text, utm_medium text, utm_campaign text,
  user_agent text
);
create index if not exists mover_reveals_mover_idx on movematch.mover_reveals(mover_id, created_at desc);
create index if not exists mover_reveals_phone_idx on movematch.mover_reveals(phone, created_at desc);
alter table movematch.mover_reveals enable row level security;
revoke all on movematch.mover_reveals from anon, authenticated;

-- The public card of one mover. Never includes the phone, email, token or anything private.
create or replace function movematch.public_mover_json(m movematch.movers) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id, 'slug', m.slug, 'company_name', m.company_name, 'name', m.name, 'has_logo', m.logo is not null,
    'google_url', m.google_url, 'google_rating', m.google_rating, 'google_reviews', m.google_reviews,
    'midrag_url', m.midrag_url, 'midrag_rating', m.midrag_rating, 'midrag_reviews', m.midrag_reviews,
    'facebook_url', m.facebook_url, 'facebook_recommend', m.facebook_recommend, 'facebook_reviews', m.facebook_reviews,
    'areas', coalesce((select jsonb_agg(a.area order by a.area) from movematch.mover_service_areas a where a.mover_id = m.id), '[]'::jsonb),
    'profile', m.profile - 'public_phone' - 'rank')
$$;
revoke all on function movematch.public_mover_json(movematch.movers) from public, anon, authenticated;

create or replace function movematch.mover_is_public(m movematch.movers) returns boolean
language sql stable set search_path = '' as $$
  select m.profile_public and m.active and m.status = 'approved' and not m.is_demo and m.slug is not null
$$;
revoke all on function movematch.mover_is_public(movematch.movers) from public, anon, authenticated;

create or replace function public.mm_public_movers() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(movematch.public_mover_json(m) order by coalesce((m.profile->>'rank')::int, 999), m.created_at), '[]'::jsonb)
    from movematch.movers m where movematch.mover_is_public(m)
$$;

create or replace function public.mm_public_mover(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select movematch.public_mover_json(m) from movematch.movers m where m.slug = p_slug and movematch.mover_is_public(m)
$$;

-- Client asks for a mover's number: log name + phone, return the number. Rate-limited; sends nothing.
create or replace function public.mm_reveal_mover_phone(p_slug text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers; v_name text := left(trim(coalesce(p->>'name', '')), 80); v_phone text := coalesce(p->>'phone', '');
begin
  select * into m from movematch.movers x where x.slug = p_slug and movematch.mover_is_public(x);
  if m.id is null then raise exception 'not found'; end if;
  if length(v_name) < 2 then raise exception 'invalid name'; end if;
  if v_phone !~ '^05\d{8}$' then raise exception 'invalid phone'; end if;
  if (select count(*) from movematch.mover_reveals where phone = v_phone and created_at > now() - interval '1 day') >= 20 then raise exception 'too many'; end if;
  if (select count(*) from movematch.mover_reveals where created_at > now() - interval '1 hour') >= 300 then raise exception 'busy'; end if;
  -- One row per client and mover per day is enough for attribution.
  if not exists (select 1 from movematch.mover_reveals where mover_id = m.id and phone = v_phone and created_at > now() - interval '1 day') then
    insert into movematch.mover_reveals(mover_id, name, phone, utm_source, utm_medium, utm_campaign, user_agent)
    values (m.id, v_name, v_phone, nullif(left(p->>'utm_source', 100), ''), nullif(left(p->>'utm_medium', 100), ''),
            nullif(left(p->>'utm_campaign', 150), ''), nullif(left(p->>'user_agent', 300), ''));
  end if;
  return jsonb_build_object('phone', coalesce(nullif(m.profile->>'public_phone', ''), m.phone), 'company', m.company_name);
end $$;

-- Admin: save slug, switch and profile (the server action builds and validates the JSON).
create or replace function public.mm_admin_save_mover_profile(p_secret text, p_id uuid, p_slug text, p_public boolean, p_profile jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  if jsonb_typeof(coalesce(p_profile, '{}'::jsonb)) <> 'object' then raise exception 'invalid profile'; end if;
  update movematch.movers set slug = nullif(lower(trim(p_slug)), ''), profile_public = coalesce(p_public, false), profile = coalesce(p_profile, '{}'::jsonb)
   where id = p_id;
end $$;

-- Admin: add a company that has not joined yet (status 'prospect', inactive). Its profile stays hidden until it joins and is approved.
create or replace function public.mm_admin_add_prospect(p_secret text, p_company text, p_phone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.mm_check_admin(p_secret);
  if p_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if coalesce(length(trim(p_company)), 0) < 2 then raise exception 'invalid company'; end if;
  insert into movematch.movers(company_name, phone, status, active) values (left(trim(p_company), 120), p_phone, 'prospect', false) returning id into v_id;
  return v_id;
end $$;

-- Admin: the latest phone reveals.
create or replace function public.mm_admin_mover_reveals(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('created_at', r.created_at, 'name', r.name, 'phone', r.phone, 'utm_source', r.utm_source,
      'utm_campaign', r.utm_campaign, 'mover_id', r.mover_id, 'company', m.company_name) order by r.created_at desc)
    from (select * from movematch.mover_reveals order by created_at desc limit 200) r join movematch.movers m on m.id = r.mover_id), '[]'::jsonb);
end $$;

-- Mover panel: the mover edits the human part of their own profile. Slug, switch, facts, ratings and reviews stay with the admin.
-- Phone numbers and links are removed so contact keeps going through the "show phone" form.
create or replace function public.mm_mover_save_about(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers := movematch.me(); v jsonb := '{}'::jsonb; k text; t text; s jsonb;
begin
  foreach k in array array['tagline', 'people', 'intro', 'about'] loop
    t := left(trim(coalesce(p->>k, '')), case k when 'about' then 3000 when 'intro' then 400 else 120 end);
    t := regexp_replace(t, '(https?://|www\.)\S+', '', 'gi');
    t := regexp_replace(t, '(\+?972|0)[\s\-]?5\d([\s\-]?\d){7}', '', 'g');
    v := v || jsonb_build_object(k, t);
  end loop;
  select coalesce(jsonb_agg(left(trim(x), 80)), '[]'::jsonb) into s
    from (select x from jsonb_array_elements_text(case when jsonb_typeof(p->'services') = 'array' then p->'services' else '[]'::jsonb end) x
          where trim(x) <> '' limit 12) q;
  v := v || jsonb_build_object('services', s);
  update movematch.movers set profile = profile || v where id = m.id;
end $$;

-- Mover panel: own profile fields for the editor (mm_mover_me already returns the whole row except logo/token/auth id).

-- Sign-up: a 'prospect' row with the same phone is taken over (profile, slug and areas kept) instead of failing with 'exists'.
create or replace function public.mm_mover_signup(p jsonb, p_logo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers; v_phone text := p->>'phone';
  v_gu text := nullif(left(p->>'google_url', 500), ''); v_mu text := nullif(left(p->>'midrag_url', 500), '');
  v_fu text := nullif(left(p->>'facebook_url', 500), '');
begin
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if coalesce(length(trim(p->>'company')), 0) < 2 then raise exception 'invalid company'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if (v_gu is not null and v_gu !~ '^https://') or (v_mu is not null and v_mu !~ '^https://') or (v_fu is not null and v_fu !~ '^https://') then
    raise exception 'invalid url';
  end if;
  if coalesce(p->>'terms_version', '') = '' then raise exception 'terms'; end if;
  if exists (select 1 from movematch.movers where phone = v_phone and status = 'prospect') then
    update movematch.movers set
      name = left(trim(coalesce(p->>'name','')),120), company_name = left(trim(p->>'company'),120),
      email = nullif(left(trim(coalesce(p->>'email','')),200),''), logo = coalesce(p_logo, logo),
      google_url = coalesce(v_gu, google_url), midrag_url = coalesce(v_mu, midrag_url), facebook_url = coalesce(v_fu, facebook_url),
      signup_note = nullif(left(trim(coalesce(p->>'note','')),1000),''), status = 'pending', active = false,
      terms_accepted_at = now(), terms_version = left(p->>'terms_version', 40), created_at = now(),
      google_rating = coalesce(case when v_gu is not null then least(greatest((p->>'google_rating')::numeric, 0), 5) end, google_rating),
      google_reviews = coalesce(case when v_gu is not null then greatest((p->>'google_reviews')::int, 0) end, google_reviews),
      midrag_rating = coalesce(case when v_mu is not null then least(greatest((p->>'midrag_rating')::numeric, 0), 10) end, midrag_rating),
      midrag_reviews = coalesce(case when v_mu is not null then greatest((p->>'midrag_reviews')::int, 0) end, midrag_reviews),
      facebook_recommend = coalesce(case when v_fu is not null then least(greatest((p->>'facebook_recommend')::int, 0), 100) end, facebook_recommend),
      facebook_reviews = coalesce(case when v_fu is not null then greatest((p->>'facebook_reviews')::int, 0) end, facebook_reviews)
    where phone = v_phone and status = 'prospect' returning * into m;
    return jsonb_build_object('id', m.id, 'company', m.company_name);
  end if;
  if exists (select 1 from movematch.movers where phone = v_phone) then raise exception 'exists'; end if;
  if (select count(*) from movematch.movers where status = 'pending' and created_at > now() - interval '1 day') >= 50 then raise exception 'too many'; end if;
  insert into movematch.movers(name, company_name, phone, email, logo, google_url, midrag_url, facebook_url, signup_note, status, active, terms_accepted_at, terms_version,
                               google_rating, google_reviews, midrag_rating, midrag_reviews, facebook_recommend, facebook_reviews)
  values (left(trim(coalesce(p->>'name','')),120), left(trim(p->>'company'),120), v_phone, nullif(left(trim(coalesce(p->>'email','')),200),''),
          p_logo, v_gu, v_mu, v_fu, nullif(left(trim(coalesce(p->>'note','')),1000),''), 'pending', false, now(), left(p->>'terms_version', 40),
          case when v_gu is not null then least(greatest((p->>'google_rating')::numeric, 0), 5) end, case when v_gu is not null then greatest((p->>'google_reviews')::int, 0) end,
          case when v_mu is not null then least(greatest((p->>'midrag_rating')::numeric, 0), 10) end, case when v_mu is not null then greatest((p->>'midrag_reviews')::int, 0) end,
          case when v_fu is not null then least(greatest((p->>'facebook_recommend')::int, 0), 100) end, case when v_fu is not null then greatest((p->>'facebook_reviews')::int, 0) end)
  returning * into m;
  return jsonb_build_object('id', m.id, 'company', m.company_name);
end $$;

revoke all on function public.mm_public_movers(), public.mm_public_mover(text), public.mm_reveal_mover_phone(text, jsonb),
  public.mm_admin_save_mover_profile(text, uuid, text, boolean, jsonb), public.mm_admin_add_prospect(text, text, text),
  public.mm_admin_mover_reveals(text), public.mm_mover_save_about(jsonb) from public, anon, authenticated;
grant execute on function public.mm_public_movers(), public.mm_public_mover(text), public.mm_reveal_mover_phone(text, jsonb),
  public.mm_admin_save_mover_profile(text, uuid, text, boolean, jsonb), public.mm_admin_add_prospect(text, text, text),
  public.mm_admin_mover_reveals(text) to anon;
grant execute on function public.mm_mover_save_about(jsonb) to authenticated;

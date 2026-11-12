-- 007: client service↔price preference, mover ratings (Google + Midrag), mover contact shown to clients,
-- and an admin lead lookup used by the WhatsApp→SMS fallback.

alter table movematch.leads add column if not exists priority smallint check (priority between 1 and 5); -- 1 = service … 5 = price
alter table movematch.movers add column if not exists google_url text;
alter table movematch.movers add column if not exists google_rating numeric(2,1) check (google_rating between 0 and 5);
alter table movematch.movers add column if not exists google_reviews int check (google_reviews >= 0);
alter table movematch.movers add column if not exists midrag_url text;
alter table movematch.movers add column if not exists midrag_rating numeric(3,1) check (midrag_rating between 0 and 10);
alter table movematch.movers add column if not exists midrag_reviews int check (midrag_reviews >= 0);

create or replace function public.mm_update_lead(p_id uuid, p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
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

-- Offers as the client sees them: now including the mover's contact details and ratings.
create or replace function movematch.client_offers_json(p_lead uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'price', b.price, 'available_date', b.available_date, 'available_flexible', b.available_flexible,
      'note', b.note, 'created_at', b.created_at,
      'company', coalesce(nullif(m.company_name, ''), nullif(b.mover_name, ''), ''),
      'contact', coalesce(m.name, ''), 'phone', b.mover_phone,
      'mover_id', m.id, 'has_logo', m.logo is not null,
      'google_url', m.google_url, 'google_rating', m.google_rating, 'google_reviews', m.google_reviews,
      'midrag_url', m.midrag_url, 'midrag_rating', m.midrag_rating, 'midrag_reviews', m.midrag_reviews
    ) order by b.created_at), '[]'::jsonb)
  from movematch.bids b left join movematch.movers m on m.id = b.mover_id
  where b.lead_id = p_lead and not b.hidden;
$$;

-- (old 6-argument mm_admin_save_mover is kept until the new site version is live)
create or replace function public.mm_admin_save_mover(p_secret text, p_id uuid, p jsonb, p_logo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers; v_phone text := p->>'phone';
  v_gr numeric := nullif(p->>'google_rating','')::numeric; v_gn int := nullif(p->>'google_reviews','')::int;
  v_mr numeric := nullif(p->>'midrag_rating','')::numeric; v_mn int := nullif(p->>'midrag_reviews','')::int;
  v_gu text := nullif(left(p->>'google_url', 500), ''); v_mu text := nullif(left(p->>'midrag_url', 500), '');
begin
  perform public.mm_check_admin(p_secret);
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp|gif);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if (v_gu is not null and v_gu !~ '^https://') or (v_mu is not null and v_mu !~ '^https://') then raise exception 'invalid url'; end if;
  delete from movematch.wa_optouts where phone = v_phone;
  if p_id is null then
    insert into movematch.movers(name, company_name, phone, logo, google_url, google_rating, google_reviews, midrag_url, midrag_rating, midrag_reviews)
    values (left(coalesce(p->>'name',''),120), left(coalesce(p->>'company',''),120), v_phone, p_logo, v_gu, v_gr, v_gn, v_mu, v_mr, v_mn)
    on conflict (phone) do update set name = excluded.name, company_name = excluded.company_name,
      logo = coalesce(excluded.logo, movematch.movers.logo), google_url = excluded.google_url, google_rating = excluded.google_rating,
      google_reviews = excluded.google_reviews, midrag_url = excluded.midrag_url, midrag_rating = excluded.midrag_rating,
      midrag_reviews = excluded.midrag_reviews, active = true, opted_out_at = null
    returning * into m;
  else
    update movematch.movers set name = left(coalesce(p->>'name',''),120), company_name = left(coalesce(p->>'company',''),120),
      phone = v_phone, logo = coalesce(p_logo, logo), google_url = v_gu, google_rating = v_gr, google_reviews = v_gn,
      midrag_url = v_mu, midrag_rating = v_mr, midrag_reviews = v_mn
    where id = p_id returning * into m;
  end if;
  return to_jsonb(m) - 'logo';
end $$;

-- Server-side lookup of one lead (WhatsApp delivery-failure → SMS fallback).
create or replace function public.mm_admin_lead(p_secret text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.mm_check_admin(p_secret);
  return (select to_jsonb(l) - 'edit_token' from movematch.leads l where l.id = p_id);
end $$;

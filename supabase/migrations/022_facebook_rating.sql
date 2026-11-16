-- Facebook rating for movers, next to Google and Midrag.
-- Facebook pages show "X% recommend" and a review count (no stars), so we store the percentage, not a star rating.
-- Clients see only the ratings a mover has (components/MoverRatings.tsx).

alter table movematch.movers
  add column if not exists facebook_url text,
  add column if not exists facebook_recommend smallint check (facebook_recommend between 0 and 100),
  add column if not exists facebook_reviews int check (facebook_reviews >= 0);

-- Offers shown to the client: add the Facebook fields.
create or replace function movematch.client_offers_json(p_lead uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'price', b.price, 'available_date', b.available_date, 'available_flexible', b.available_flexible,
      'note', b.note, 'created_at', b.created_at,
      'company', coalesce(nullif(m.company_name, ''), nullif(b.mover_name, ''), ''),
      'contact', coalesce(m.name, ''), 'phone', b.mover_phone,
      'mover_id', m.id, 'has_logo', m.logo is not null,
      'google_url', m.google_url, 'google_rating', m.google_rating, 'google_reviews', m.google_reviews,
      'midrag_url', m.midrag_url, 'midrag_rating', m.midrag_rating, 'midrag_reviews', m.midrag_reviews,
      'facebook_url', m.facebook_url, 'facebook_recommend', m.facebook_recommend, 'facebook_reviews', m.facebook_reviews
    ) order by b.created_at), '[]'::jsonb)
  from movematch.bids b left join movematch.movers m on m.id = b.mover_id
  where b.lead_id = p_lead and not b.hidden;
$$;

-- Admin add / edit mover.
create or replace function public.mm_admin_save_mover(p_secret text, p_id uuid, p jsonb, p_logo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m movematch.movers; v_phone text := p->>'phone';
  v_gr numeric := nullif(p->>'google_rating','')::numeric; v_gn int := nullif(p->>'google_reviews','')::int;
  v_mr numeric := nullif(p->>'midrag_rating','')::numeric; v_mn int := nullif(p->>'midrag_reviews','')::int;
  v_fr smallint := nullif(p->>'facebook_recommend','')::smallint; v_fn int := nullif(p->>'facebook_reviews','')::int;
  v_gu text := nullif(left(p->>'google_url', 500), ''); v_mu text := nullif(left(p->>'midrag_url', 500), '');
  v_fu text := nullif(left(p->>'facebook_url', 500), '');
begin
  perform public.mm_check_admin(p_secret);
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp|gif);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if (v_gu is not null and v_gu !~ '^https://') or (v_mu is not null and v_mu !~ '^https://') or (v_fu is not null and v_fu !~ '^https://') then
    raise exception 'invalid url';
  end if;
  delete from movematch.wa_optouts where phone = v_phone;
  if p_id is null then
    insert into movematch.movers(name, company_name, phone, logo, google_url, google_rating, google_reviews, midrag_url, midrag_rating, midrag_reviews,
                                 facebook_url, facebook_recommend, facebook_reviews)
    values (left(coalesce(p->>'name',''),120), left(coalesce(p->>'company',''),120), v_phone, p_logo, v_gu, v_gr, v_gn, v_mu, v_mr, v_mn, v_fu, v_fr, v_fn)
    on conflict (phone) do update set name = excluded.name, company_name = excluded.company_name,
      logo = coalesce(excluded.logo, movematch.movers.logo), google_url = excluded.google_url, google_rating = excluded.google_rating,
      google_reviews = excluded.google_reviews, midrag_url = excluded.midrag_url, midrag_rating = excluded.midrag_rating,
      midrag_reviews = excluded.midrag_reviews, facebook_url = excluded.facebook_url, facebook_recommend = excluded.facebook_recommend,
      facebook_reviews = excluded.facebook_reviews, active = true, opted_out_at = null
    returning * into m;
  else
    update movematch.movers set name = left(coalesce(p->>'name',''),120), company_name = left(coalesce(p->>'company',''),120),
      phone = v_phone, logo = coalesce(p_logo, logo), google_url = v_gu, google_rating = v_gr, google_reviews = v_gn,
      midrag_url = v_mu, midrag_rating = v_mr, midrag_reviews = v_mn,
      facebook_url = v_fu, facebook_recommend = v_fr, facebook_reviews = v_fn
    where id = p_id returning * into m;
  end if;
  return to_jsonb(m) - 'logo';
end $$;

-- Public sign-up. As with Google and Midrag, a self-reported rating is kept only when the link is given.
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

-- Data (owner, 16 Nov 2026): פרידמן הובלות on Facebook, 399 reviews, 100% recommend.
update movematch.movers set facebook_url = 'https://www.facebook.com/profile.php?id=100089736262553', facebook_recommend = 100, facebook_reviews = 399
  where id = '0bfaea8b-02d8-4337-835e-cbe8706a0832';

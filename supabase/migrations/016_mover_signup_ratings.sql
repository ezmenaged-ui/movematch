-- 016: movers may report their Google / Midrag rating and review count at sign-up (kept only when the matching link is given).
-- The operator verifies them against the links in /admin/movers before approving the mover.

create or replace function public.mm_mover_signup(p jsonb, p_logo text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare m movematch.movers; v_phone text := p->>'phone';
  v_gu text := nullif(left(p->>'google_url', 500), ''); v_mu text := nullif(left(p->>'midrag_url', 500), '');
begin
  if v_phone !~ '^0\d{8,9}$' then raise exception 'invalid phone'; end if;
  if coalesce(length(trim(p->>'company')), 0) < 2 then raise exception 'invalid company'; end if;
  if p_logo is not null and (p_logo !~ '^data:image/(png|jpeg|webp);base64,' or length(p_logo) > 600000) then raise exception 'invalid logo'; end if;
  if (v_gu is not null and v_gu !~ '^https://') or (v_mu is not null and v_mu !~ '^https://') then raise exception 'invalid url'; end if;
  if coalesce(p->>'terms_version', '') = '' then raise exception 'terms'; end if;
  if exists (select 1 from movematch.movers where phone = v_phone) then raise exception 'exists'; end if;
  if (select count(*) from movematch.movers where status = 'pending' and created_at > now() - interval '1 day') >= 50 then raise exception 'too many'; end if;
  insert into movematch.movers(name, company_name, phone, email, logo, google_url, midrag_url, signup_note, status, active, terms_accepted_at, terms_version,
                               google_rating, google_reviews, midrag_rating, midrag_reviews)
  values (left(trim(coalesce(p->>'name','')),120), left(trim(p->>'company'),120), v_phone, nullif(left(trim(coalesce(p->>'email','')),200),''),
          p_logo, v_gu, v_mu, nullif(left(trim(coalesce(p->>'note','')),1000),''), 'pending', false, now(), left(p->>'terms_version', 40),
          case when v_gu is not null then least(greatest((p->>'google_rating')::numeric, 0), 5) end, case when v_gu is not null then greatest((p->>'google_reviews')::int, 0) end,
          case when v_mu is not null then least(greatest((p->>'midrag_rating')::numeric, 0), 10) end, case when v_mu is not null then greatest((p->>'midrag_reviews')::int, 0) end)
  returning * into m;
  return jsonb_build_object('id', m.id, 'company', m.company_name);
end $function$;

-- MoveMatch schema, applied to the dedicated Supabase project "movematch" (ref yhixrtzidvjfwdynapqp).
-- To recreate elsewhere: run this file, then set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
-- MM_ADMIN_SECRET (select value from movematch.settings where key='admin_secret').

create schema if not exists movematch;
revoke all on schema movematch from anon, authenticated;

create table movematch.leads (
  id uuid primary key default gen_random_uuid(),
  edit_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  variant text not null check (variant in ('a','wizard','form')),
  status text not null default 'partial' check (status in ('partial','complete')),
  furthest_step int not null default 1,
  name text not null,
  phone text not null,
  city text,
  move_from jsonb,
  move_to jsonb,
  videos jsonb not null default '[]'::jsonb,
  video_skipped boolean not null default false,
  utm_source text, utm_medium text, utm_campaign text,
  user_agent text,
  notes text,
  handled boolean not null default false
);
alter table movematch.leads enable row level security;

create table movematch.settings (key text primary key, value text not null);
alter table movematch.settings enable row level security;
insert into movematch.settings values ('admin_secret', encode(extensions.gen_random_bytes(24),'hex'));

create or replace function public.mm_create_lead(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
  if coalesce(length(p->>'name'),0) < 2 or (p->>'phone') !~ '^05\d{8}$' then
    raise exception 'invalid lead';
  end if;
  insert into movematch.leads(variant,status,furthest_step,name,phone,city,move_from,move_to,video_skipped,utm_source,utm_medium,utm_campaign,user_agent)
  values (p->>'variant', coalesce(p->>'status','partial'), coalesce((p->>'furthest_step')::int,1),
    left(p->>'name',120), p->>'phone', left(p->>'city',80), p->'move_from', p->'move_to',
    coalesce((p->>'video_skipped')::boolean,false),
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'user_agent',400))
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.edit_token);
end $$;

create or replace function public.mm_update_lead(p_id uuid, p_token uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r movematch.leads;
begin
  update movematch.leads set
    updated_at = now(),
    name = coalesce(left(p->>'name',120), name),
    phone = case when (p->>'phone') ~ '^05\d{8}$' then p->>'phone' else phone end,
    city = coalesce(left(p->>'city',80), city),
    move_from = coalesce(p->'move_from', move_from),
    move_to = coalesce(p->'move_to', move_to),
    status = case when p->>'status' in ('partial','complete') then p->>'status' else status end,
    furthest_step = greatest(furthest_step, coalesce((p->>'furthest_step')::int, 0)),
    video_skipped = coalesce((p->>'video_skipped')::boolean, video_skipped),
    videos = case when p ? 'add_video' then videos || jsonb_build_array(p->'add_video') else videos end
  where id = p_id and edit_token = p_token
  returning * into r;
  if r.id is null then raise exception 'not found'; end if;
  return to_jsonb(r) - 'edit_token';
end $$;

create or replace function public.mm_admin_list(p_secret text, p_limit int default 500)
returns setof jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from movematch.settings where key='admin_secret' and value=p_secret) then
    raise exception 'forbidden';
  end if;
  return query select to_jsonb(l) - 'edit_token' from movematch.leads l order by created_at desc limit p_limit;
end $$;

create or replace function public.mm_admin_set_handled(p_secret text, p_id uuid, p_handled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from movematch.settings where key='admin_secret' and value=p_secret) then
    raise exception 'forbidden';
  end if;
  update movematch.leads set handled = p_handled, updated_at = now() where id = p_id;
end $$;

revoke all on function public.mm_create_lead(jsonb), public.mm_update_lead(uuid,uuid,jsonb),
  public.mm_admin_list(text,int), public.mm_admin_set_handled(text,uuid,boolean) from public, authenticated;
grant execute on function public.mm_create_lead(jsonb), public.mm_update_lead(uuid,uuid,jsonb),
  public.mm_admin_list(text,int), public.mm_admin_set_handled(text,uuid,boolean) to anon;

-- Video storage: anonymous upload only, no listing/reading. 50MB per object is the free-tier max,
-- so the client uploads larger clips as <path>.p0, .p1, ... and /admin/video stitches them back.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('movematch-videos','movematch-videos', false, 52428800, array['video/*'])
on conflict (id) do nothing;
create policy "mm anon upload videos" on storage.objects for insert to anon
  with check (bucket_id = 'movematch-videos');

-- Admin page reads videos by sending header x-mm-admin: <admin_secret>.
create or replace function public.mm_is_admin_request()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from movematch.settings where key='admin_secret'
    and value = coalesce(current_setting('request.headers', true)::json->>'x-mm-admin',''));
$$;
revoke all on function public.mm_is_admin_request() from public, authenticated;
grant execute on function public.mm_is_admin_request() to anon;
create policy "mm admin read videos" on storage.objects for select to anon
  using (bucket_id = 'movematch-videos' and public.mm_is_admin_request());

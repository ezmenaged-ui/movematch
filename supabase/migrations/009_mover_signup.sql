-- 009: public mover sign-up (/movers/join) → pending movers, approved from admin.
alter table movematch.movers add column if not exists status text not null default 'approved' check (status in ('pending','approved'));
alter table movematch.movers add column if not exists signup_note text;
alter table movematch.movers add column if not exists email text;
-- Functions: public.mm_mover_signup(p jsonb, p_logo text) creates a pending, inactive mover and never overwrites one;
-- public.mm_admin_approve_mover(p_secret, p_id) approves + activates. (Full definitions applied as migration 009_mover_signup.)

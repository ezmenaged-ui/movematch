-- 020: funnel E (/e). One information page where the client picks a full 3-minute video or the item list
-- (the other is an optional extra). Stored as leads.variant = 'choice'; items and videos use the existing columns.
alter table movematch.leads drop constraint if exists leads_variant_check;
alter table movematch.leads add constraint leads_variant_check check (variant in ('a', 'wizard', 'form', 'items', 'choice'));

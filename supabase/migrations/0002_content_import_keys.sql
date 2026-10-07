-- Stage 2 (additive, non-destructive): stable identity for imported FAQ rows so re-running the import never duplicates them.
-- Run in the SQL Editor AFTER 0001_init.sql. Safe to run more than once. Touches no existing data.
-- (A plain unique index is used on purpose: Postgres allows many NULLs in it, and PostgREST's ON CONFLICT needs a non-partial index.)
begin;
alter table public.faqs add column if not exists import_key text;
drop index if exists public.faqs_import_key_uidx;
create unique index if not exists faqs_import_key_uidx on public.faqs (import_key);
commit;

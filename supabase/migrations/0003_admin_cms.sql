-- Stage 3 (additive, non-destructive): read/unread tracking for inquiries in the admin CMS.
-- Run in the SQL Editor AFTER 0001 and 0002. Safe to run more than once. Touches no existing rows.
-- Policies are NOT changed: only admins can read/update inquiries (policy "admin manage"), and visitors still have no access.
begin;
alter table public.inquiries add column if not exists read_at timestamptz;      -- null = unread
create index if not exists inquiries_unread_idx on public.inquiries (created_at desc) where read_at is null;
grant update (status, read_at) on public.inquiries to authenticated;            -- column-level: admins can change ONLY these two columns
commit;

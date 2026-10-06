-- Run each block separately in the SQL Editor and compare with "Expected".
-- 1) All 12 tables exist, each with RLS enabled.   Expected: 12 rows, every rls_enabled = true
select tablename, rowsecurity as rls_enabled from pg_tables where schemaname = 'public' order by 1;

-- 2) Policies exist.   Expected: 25+ rows
select tablename, policyname, cmd from pg_policies where schemaname in ('public', 'storage') order by 1, 2;

-- 3) Storage bucket.   Expected: 1 row: media | true | 5242880
select id, public, file_size_limit from storage.buckets where id = 'media';

-- 4) Enums.   Expected: 7 rows
select typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e' order by 1;

-- 5) Visitors cannot read inquiries.   Expected: ERROR "permission denied for table inquiries"
begin; set local role anon; select count(*) from public.inquiries; rollback;

-- 6) Visitors can read published content only.   Expected: count = 0 on a fresh database (no error)
begin; set local role anon; select count(*) from public.projects; rollback;

-- 7) Visitors cannot write.   Expected: ERROR "permission denied for table projects"
begin; set local role anon; insert into public.projects (slug, category, category_label, title, description) values ('x','x','{"en":"x"}','{"en":"x"}','{"en":"x"}'); rollback;

-- 8) After first-admin.sql: your profile exists with role admin.   Expected: 1 row, role = admin
select email, role from public.profiles;

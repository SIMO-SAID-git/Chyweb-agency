-- =====================================================================================
-- CHYWEB: complete database setup for a NEW Supabase project.
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- * Wrapped in one transaction: if anything fails, nothing is applied.
-- * Non-destructive: no DROP TABLE / DELETE / TRUNCATE. Re-running is safe (idempotent).
-- * Multilingual text is stored as jsonb: {"en": "...", "fr": "...", "ar": "..."} ("en" required on titles).
-- =====================================================================================
begin;

-- ---------- 1. Enums ----------------------------------------------------------------
do $$ begin create type public.app_role as enum ('admin', 'editor'); exception when duplicate_object then null; end $$;
do $$ begin create type public.locale_code as enum ('en', 'fr', 'ar'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inquiry_status as enum ('new', 'contacted', 'in_discussion', 'proposal_sent', 'accepted', 'rejected', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inquiry_project_type as enum ('new', 'redesign', 'ecommerce', 'other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inquiry_budget as enum ('small', 'medium', 'large', 'discuss'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inquiry_timeline as enum ('asap', 'short', 'medium', 'flexible'); exception when duplicate_object then null; end $$;
do $$ begin create type public.price_model as enum ('fixed', 'starting_from', 'custom'); exception when duplicate_object then null; end $$;

-- ---------- 2. Helper functions -----------------------------------------------------
-- Valid multilingual value: a JSON object whose keys are only en/fr/ar (and, if required, a non-empty "en").
create or replace function public.is_localized(v jsonb, require_en boolean default true) returns boolean
language sql immutable as $$
  select jsonb_typeof(v) = 'object'
     and (select bool_and(k in ('en', 'fr', 'ar')) from jsonb_object_keys(v) k) is not false
     and (not require_en or (v ? 'en' and v -> 'en' not in ('""'::jsonb, '[]'::jsonb, 'null'::jsonb)))
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- 3. Tables ---------------------------------------------------------------
-- Staff accounts. Rows are created ONLY manually (see supabase/first-admin.sql). There is no signup trigger,
-- so nobody can obtain a profile (and thus admin rights) by registering.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role public.app_role not null default 'editor',
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.profiles p where p.id = auth.uid()) $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') $$;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category ~ '^[a-z0-9-]+$'),           -- filter key, e.g. ecom / corporate
  category_label jsonb not null check (public.is_localized(category_label)),
  title jsonb not null check (public.is_localized(title)),
  description jsonb not null check (public.is_localized(description)),
  objectives jsonb check (public.is_localized(objectives, false)),
  challenges jsonb check (public.is_localized(challenges, false)),
  solutions jsonb check (public.is_localized(solutions, false)),
  results jsonb check (public.is_localized(results, false)),           -- only verified results
  client_name text,
  live_url text check (live_url is null or live_url ~* '^https?://'),
  github_url text check (github_url is null or github_url ~* '^https?://'),
  completed_on date,
  thumbnail text,                                                      -- storage path or /images/... path
  thumbnail_alt jsonb check (public.is_localized(thumbnail_alt, false)),
  gallery jsonb not null default '[]' check (jsonb_typeof(gallery) = 'array'),  -- ordered: [{"path":"..","alt":{"en":".."}}]
  technologies text[] not null default '{}',
  is_concept boolean not null default true,                            -- true = fictional concept, not client work
  featured boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0,
  seo_title jsonb check (public.is_localized(seo_title, false)),
  seo_description jsonb check (public.is_localized(seo_description, false)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  key text unique check (key ~ '^[a-z0-9_-]{1,40}$'),                  -- value the inquiry form sends as "service"
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title jsonb not null check (public.is_localized(title)),
  description jsonb not null check (public.is_localized(description)), -- short card text
  lead jsonb check (public.is_localized(lead, false)),                 -- service page intro
  features jsonb check (public.is_localized(features, false)),         -- {"en":["..",".."],"fr":[..]}
  image text,
  image_alt jsonb check (public.is_localized(image_alt, false)),
  icon text,
  seo_title jsonb check (public.is_localized(seo_title, false)),
  seo_description jsonb check (public.is_localized(seo_description, false)),
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_projects (                   -- related projects per service
  service_id uuid not null references public.services (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  sort_order int not null default 0,
  primary key (service_id, project_id)
);

create table if not exists public.faqs (                               -- service_id null = general FAQ
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services (id) on delete cascade,
  question jsonb not null check (public.is_localized(question)),
  answer jsonb not null check (public.is_localized(answer)),
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_role text,
  feedback jsonb not null check (public.is_localized(feedback, false) and feedback <> '{}'::jsonb),
  rating smallint check (rating between 1 and 5),
  avatar text,
  is_demo boolean not null default false,
  approved boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or approved)                                    -- can never be public without approval
);

create table if not exists public.pricing_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (public.is_localized(name)),
  description jsonb check (public.is_localized(description, false)),
  model public.price_model not null default 'custom',
  price numeric(12, 2) check (price is null or price >= 0),
  currency char(3) check (currency is null or currency ~ '^[A-Z]{3}$'),
  billing text check (billing in ('one_time', 'monthly', 'yearly', 'custom')),
  features jsonb check (public.is_localized(features, false)),
  limitations jsonb check (public.is_localized(limitations, false)),
  cta_label jsonb check (public.is_localized(cta_label, false)),
  featured boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (model = 'custom' or (price is not null and currency is not null))
);

create table if not exists public.site_content (                       -- editable homepage / contact / footer text, etc.
  key text primary key check (key ~ '^[a-z0-9_.-]{1,80}$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Contact-form submissions. Column names/limits mirror src/lib/inquiry.ts and src/app/api/inquiries/route.ts.
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('CW-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  submission_id uuid not null unique,                                  -- idempotency key (duplicate submit -> 23505 -> HTTP 409)
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  company text check (char_length(company) <= 120),
  country text check (char_length(country) <= 80),
  project_type public.inquiry_project_type not null,
  service text not null check (service ~ '^[a-z0-9_-]{1,40}$'),       -- services.key or 'unsure'
  description text not null check (char_length(description) between 20 and 4000),
  objectives text check (char_length(objectives) <= 2000),
  existing_url text check (char_length(existing_url) <= 300),
  budget public.inquiry_budget not null,
  timeline public.inquiry_timeline not null,
  extra text check (char_length(extra) <= 2000),
  lang public.locale_code not null,
  status public.inquiry_status not null default 'new',
  consent_at timestamptz not null,
  admin_email_sent boolean not null default false,
  client_email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiry_notes (                      -- private internal notes (history)
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null check (char_length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.media_assets (                       -- metadata for files in the "media" bucket
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  alt jsonb check (public.is_localized(alt, false)),
  mime_type text, size_bytes bigint check (size_bytes >= 0), width int, height int,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (                       -- dashboard "recent activity"; written only by trigger
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  table_name text not null,
  row_id text,
  label text,
  created_at timestamptz not null default now()
);

-- ---------- 4. Indexes ---------------------------------------------------------------
create index if not exists projects_pub_idx on public.projects (published, sort_order);
create index if not exists projects_cat_idx on public.projects (category);
create index if not exists services_pub_idx on public.services (published, sort_order);
create index if not exists service_projects_project_idx on public.service_projects (project_id);
create index if not exists faqs_pub_idx on public.faqs (published, sort_order);
create index if not exists faqs_service_idx on public.faqs (service_id);
create index if not exists testimonials_pub_idx on public.testimonials (approved, published, sort_order);
create index if not exists pricing_pub_idx on public.pricing_packages (published, sort_order);
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);
create index if not exists inquiries_service_idx on public.inquiries (service);
create index if not exists inquiries_email_idx on public.inquiries (lower(email));
create index if not exists inquiry_notes_idx on public.inquiry_notes (inquiry_id, created_at);
create index if not exists activity_idx on public.activity_log (created_at desc);

-- ---------- 5. Triggers --------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['projects','services','faqs','testimonials','pricing_packages','site_content','inquiries'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format('create trigger trg_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Audit trail. Stores a label only (title/slug/key/reference), never inquiry personal data.
create or replace function public.log_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.activity_log (actor, action, table_name, row_id, label)
  values (auth.uid(), tg_op, tg_table_name, coalesce(r ->> 'id', r ->> 'key'),
          coalesce(r #>> '{title,en}', r #>> '{name,en}', r ->> 'client_name', r ->> 'slug', r ->> 'key', r ->> 'reference'));
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['projects','services','faqs','testimonials','pricing_packages','site_content','media_assets','inquiries'] loop
    execute format('drop trigger if exists trg_activity on public.%I', t);
    execute format('create trigger trg_activity after insert or update or delete on public.%I for each row execute function public.log_activity()', t);
  end loop;
end $$;

-- ---------- 6. Privileges (least privilege; RLS below is the second layer) ------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.projects, public.services, public.service_projects, public.faqs,
                public.testimonials, public.pricing_packages, public.site_content to anon;
grant select, insert, update, delete on public.projects, public.services, public.service_projects, public.faqs,
                public.testimonials, public.pricing_packages, public.site_content, public.media_assets to authenticated;
grant select on public.profiles, public.activity_log to authenticated;
-- Inquiries: NO insert (the server inserts with the service-role key). Admins may read, delete and change ONLY the status.
grant select, delete on public.inquiries to authenticated;
grant update (status) on public.inquiries to authenticated;
grant select, insert, delete on public.inquiry_notes to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------- 7. Row Level Security -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.services enable row level security;
alter table public.service_projects enable row level security;
alter table public.faqs enable row level security;
alter table public.testimonials enable row level security;
alter table public.pricing_packages enable row level security;
alter table public.site_content enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_notes enable row level security;
alter table public.media_assets enable row level security;
alter table public.activity_log enable row level security;

-- Public (visitors): published/approved content only.
drop policy if exists "public read published" on public.projects;
create policy "public read published" on public.projects for select to anon, authenticated using (published);
drop policy if exists "public read published" on public.services;
create policy "public read published" on public.services for select to anon, authenticated using (published);
drop policy if exists "public read published" on public.faqs;
create policy "public read published" on public.faqs for select to anon, authenticated using (published);
drop policy if exists "public read published" on public.pricing_packages;
create policy "public read published" on public.pricing_packages for select to anon, authenticated using (published);
drop policy if exists "public read approved" on public.testimonials;
create policy "public read approved" on public.testimonials for select to anon, authenticated using (approved and published);
drop policy if exists "public read public keys" on public.site_content;
create policy "public read public keys" on public.site_content for select to anon, authenticated using (is_public);
drop policy if exists "public read links" on public.service_projects;
create policy "public read links" on public.service_projects for select to anon, authenticated using (
  exists (select 1 from public.services s where s.id = service_id and s.published)
  and exists (select 1 from public.projects p where p.id = project_id and p.published));

-- Staff (admin + editor): manage all content, including unpublished.
do $$ declare t text; begin
  foreach t in array array['projects','services','service_projects','faqs','testimonials','pricing_packages','site_content','media_assets'] loop
    execute format('drop policy if exists "staff manage" on public.%I', t);
    execute format('create policy "staff manage" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Private data: admins only. Visitors have no policy and no grant at all.
drop policy if exists "admin manage" on public.inquiries;
create policy "admin manage" on public.inquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read notes" on public.inquiry_notes;
create policy "admin read notes" on public.inquiry_notes for select to authenticated using (public.is_admin());
drop policy if exists "admin add notes" on public.inquiry_notes;
create policy "admin add notes" on public.inquiry_notes for insert to authenticated with check (public.is_admin() and author_id = auth.uid());
drop policy if exists "admin delete notes" on public.inquiry_notes;
create policy "admin delete notes" on public.inquiry_notes for delete to authenticated using (public.is_admin());
drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
-- profiles has NO insert/update/delete policy or grant: nobody can promote themselves.
drop policy if exists "staff read activity" on public.activity_log;
create policy "staff read activity" on public.activity_log for select to authenticated using (public.is_staff());

-- ---------- 8. Storage: "media" bucket ------------------------------------------------
-- Public URLs work for visitors (images on the website). Only staff can list/upload/replace/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff list media" on storage.objects;
create policy "staff list media" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff replace media" on storage.objects;
create policy "staff replace media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists "staff delete media" on storage.objects;
create policy "staff delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

commit;

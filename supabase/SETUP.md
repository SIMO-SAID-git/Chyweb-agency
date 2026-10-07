# Supabase setup for Chyweb (Stage 1: database only)

The application is **not connected yet**. Do these steps, then confirm so Stage 2 (integration) can start.

## 1. Create the project
1. Go to https://supabase.com, sign in, click **New project**.
2. Pick an organization, name it `chyweb`, choose a **strong database password** (store it in a password manager; the app does not need it), choose the region closest to your visitors, click **Create new project**. Wait until it finishes provisioning.

## 2. Turn off public sign-ups (important)
**Authentication -> Sign In / Providers** (older UI: *Authentication -> Providers -> Email*): switch **"Allow new users to sign up"** OFF. Admin users will be created manually by you. (Even with sign-ups on, a new user cannot do anything: rights come only from a row in `profiles`, which only you can create. Turning it off is defense in depth.)

## 3. Run the migration
1. In the left sidebar open **SQL Editor** -> **New query**.
2. Open `supabase/migrations/0001_init.sql` from the project, copy **all** of it, paste, click **Run**.
3. Expected: "Success. No rows returned". It runs in one transaction, so a failure applies nothing; you can fix and re-run. It is safe to run twice. It never deletes data.

### 3b. (Stage 2) Run the second migration
SQL Editor -> new query -> paste `supabase/migrations/0002_content_import_keys.sql` -> Run. Then follow "Stage 2" in the README to import your content.

## 4. Create your admin login, then make it an admin
1. **Authentication -> Users -> Add user -> Create new user**: enter your email + a strong password, tick **Auto Confirm User**.
2. SQL Editor -> new query: paste `supabase/first-admin.sql`, replace `YOUR-ADMIN-EMAIL@example.com` with that email, **Run**. Expected: "1 row affected".

## 5. Verify
Run the blocks in `supabase/verify.sql` one at a time and compare with the "Expected" comment above each. Checklist:
- [ ] 12 tables listed, all `rls_enabled = true`
- [ ] 25 or more policies listed
- [ ] bucket `media`: public = true, limit 5242880 (5 MB)
- [ ] 7 enums
- [ ] test 5 (anon reads inquiries) gives **permission denied**
- [ ] test 7 (anon inserts a project) gives **permission denied**
- [ ] your profile row shows role `admin`
- [ ] **Storage** page shows a bucket named `media`

## 6. Find your keys
**Project Settings -> API** (or **API Keys**):
- **Project URL**: `https://xxxxxxxx.supabase.co`
- **Use the "Legacy API Keys" tab for now**: copy `anon` (public) and `service_role` (secret).
  Newer projects also show `sb_publishable_...` / `sb_secret_...` keys. The current server code was written for the legacy JWT keys; I will make it work with the new keys in Stage 2. Please use the legacy ones until then.

## 7. Environment variables
| Variable | Value | Public or secret |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | your real domain, e.g. `https://chyweb.com` | public |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` key | public (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **SECRET. Server only. Never `NEXT_PUBLIC_`, never commit, never paste in chat.** |
| `RESEND_API_KEY` | Resend API key | **SECRET** |
| `EMAIL_FROM` | `Chyweb <hello@your-verified-domain.com>` | server |
| `ADMIN_EMAIL` | inbox for new-inquiry alerts | server |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `_PHONE`, `NEXT_PUBLIC_WHATSAPP_URL` | already set | public |

Local: put them in `.env.local` (git-ignored). **Production (e.g. Vercel):** Project -> Settings -> Environment Variables -> add each one for *Production* (and *Preview* if wanted) -> **redeploy**. `NEXT_PUBLIC_` values are baked in at build time, so a redeploy is required after any change.

## What the database contains
| Table | Purpose | Public can read? |
|---|---|---|
| `profiles` | staff accounts + role (`admin` / `editor`); no signup trigger | no |
| `projects`, `services`, `service_projects`, `faqs`, `pricing_packages` | portfolio + services + related links + FAQs + pricing, multilingual (`{"en","fr","ar"}`) | only `published` rows |
| `testimonials` | feedback; DB forbids publishing without approval | only approved + published |
| `site_content` | editable homepage/contact/footer text | only `is_public` keys |
| `inquiries`, `inquiry_notes` | contact-form submissions + private notes | never (admin only) |
| `media_assets`, `activity_log` | image metadata (alt text) + dashboard activity | no (staff only) |
| Storage bucket `media` | project/service images (jpg/png/webp/avif, 5 MB) | files viewable by URL; only staff can upload/list/delete |

## Roles
- **admin**: everything, including inquiries and private notes.
- **editor**: manage content and media; cannot see inquiries or notes.
- Nobody can change roles through the app or API. Role changes are done only by you in the SQL Editor.

## Manual steps SQL cannot do
Creating the first auth user (step 4), disabling sign-ups (step 2), setting environment variables, and Resend domain verification.

## Rollback
Everything lives in the `public` schema plus the `media` bucket. On a brand-new empty project you can simply delete the project. Nothing in the migration touches Supabase's own schemas except adding storage policies and the bucket.

# Chyweb Digital Agency website

Next.js 14 (App Router) · TypeScript · Tailwind · next-intl (en / fr / ar, RTL) · Zod · Supabase (REST) · Resend.

## Status
| Area | State |
|---|---|
| Public site, 3 languages, service pages, portfolio filter, SEO | Done, tested |
| Multi-step inquiry form + `/api/inquiries` (validation, spam checks, DB insert, emails) | Done; tested against a local mock of Supabase/Resend. **Not yet tested against real Supabase/Resend.** |
| SQL schema + RLS + storage policies (`supabase/migrations/0001_init.sql`) | Written, syntax-checked; **not yet applied to a real database** |
| Admin login, dashboard, CMS (projects, services, testimonials, inquiries, media) | **Not built** |
| Public pages read services / projects / testimonials from Supabase (Stage 2) | Built and tested against real Postgres + PostgREST. **Not yet run against your real Supabase project** (see "Stage 2 setup") |

## Run locally
    npm install
    cp .env.example .env.local     # fill in values
    npm run dev                    # http://localhost:3000
    npm run typecheck && npm run lint && npm run build

## Set up the inquiry system
1. **Supabase**: create a project at supabase.com. Settings -> API: copy the Project URL, anon key and service_role key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). The service-role key is server-only; never prefix it with `NEXT_PUBLIC_`.
2. **Migration**: Supabase dashboard -> SQL Editor -> paste and run `supabase/migrations/0001_init.sql` (or `supabase db push` with the CLI). This creates all tables, RLS policies and the `media` storage bucket.
3. **Resend**: create an account at resend.com, verify your sending domain, create an API key. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on the verified domain). `ADMIN_EMAIL` (or `NEXT_PUBLIC_CONTACT_EMAIL`) receives the notifications.
4. **Test**: submit the form on `/en/contact`. Check the row in Supabase (Table Editor -> inquiries; `admin_email_sent` / `client_email_sent` show delivery) and your inbox. If keys are missing the API answers 503 and the form shows an honest "not available" message; if only email is missing, the inquiry is still saved and the success screen says no confirmation email was sent.


## Verify your real Supabase project (run this yourself)
The script never prints keys, is read-only by default, and never deletes anything.

    # keys are read from .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
    npm run verify:supabase

Optional extras:
- Admin check: set `VERIFY_ADMIN_EMAIL` and `VERIFY_ADMIN_PASSWORD` **in your terminal session only** (e.g. `export VERIFY_ADMIN_EMAIL=...`), then run the command. Do not put the password in a committed file.
- `npm run verify:supabase -- --write-test` creates ONE labelled test inquiry (the script never deletes it; remove it in the Supabase Table Editor afterwards).

What it checks: all 12 tables and the columns the app uses; the `media` bucket settings; that visitors can read only published content; that visitors can NOT read inquiries/notes/profiles/activity/media metadata and can NOT write; that the database itself rejects invalid inquiries; and (optionally) admin sign-in and authorization. It ends with `RESULT: PASS` or `RESULT: FAIL` and lists every failing check.

## Which Supabase key goes where
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the publishable (`sb_publishable_...`) or legacy `anon` key. Public by design.
- `SUPABASE_SERVICE_ROLE_KEY`: the **secret** key (`sb_secret_...`) or legacy `service_role` key. Server only. The server helper supports both formats.
- `NEXT_PUBLIC_*` values are baked in when the site is **built**. After changing one, redeploy.


## Stage 2: public content from Supabase
**What is database-driven:** services (+ their FAQs and related projects), projects, testimonials. **What stays in `messages/*.json`:** interface text (menus, buttons, form labels, section headings, About/Pricing/FAQ/legal copy).

### One-time setup on your Supabase project (in this order)
1. SQL Editor: run `supabase/migrations/0002_content_import_keys.sql` (additive; adds one column + one index; safe to repeat).
2. Terminal (needs `.env.local` with the URL + keys): `npm run import:content` is a **dry run** and writes nothing: it lists exactly what would be created.
3. If you are happy: `npm run import:content -- --apply`. It imports 4 concept projects, 6 services, 6 service FAQs and 5 service-to-project links, in English, French and Arabic. No testimonials are imported (none exist).
4. `npm run verify:supabase` (section F checks the imported content and that visitors see only published rows).
5. `npm run build && npm start`, then browse the site. NOTE: the build now **needs your Supabase project to be reachable** and fails clearly otherwise.

The importer only inserts. Rows that already exist (matched by slug) are skipped and never overwritten, so edits you make later in the CMS survive any re-run. It never deletes anything.

### Rules the site follows
- Visitors see only `published = true` rows (and testimonials that are approved AND published). This is enforced by the database (RLS), not by the website code.
- Language: the requested language, or English for any field that has no translation yet. Never another language. (Testimonials are shown in the language they were written in.)
- Production never shows static/fake content if the database fails. Failed reads are logged as `[content] Supabase read failed ...`; already-cached pages keep serving the last good version; uncached pages return an error; a build with the database unreachable fails. Static content is a **development-only** fallback (clearly logged).
- Missing config in production (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) fails the build with a clear message.

### Caching and how updates reach visitors
- Content is cached by Next.js for `CONTENT_REVALIDATE_SECONDS` (default 60) and refreshed in the background. Pages and data are cached in two layers, so a change can take up to about 2-3 times that window to appear everywhere on its own.
- **Stage 3 (admin CMS)** will make this instant: after every save the CMS calls `revalidateTag('content')` plus `revalidatePath(...)` for the item's pages in all three languages. Both are needed: tests showed `revalidatePath` is what clears a page that was previously cached as a 404 (for example a project that was unpublished and then re-published); time-based refresh never revives a cached 404.
- New projects/services published after the last deployment are served on demand (no redeploy needed). Unpublished or unknown slugs return a real HTTP 404.
- The branded full-page loading screen (`loading.tsx`) was removed on purpose: it made unknown/unpublished pages return HTTP 200 ("soft 404") instead of 404, which hurts SEO. Pages are cached, so users rarely see a loading state anyway.
- `NEXT_PUBLIC_*` variables are fixed at build time: after changing one, redeploy.

### Not part of Stage 2
Admin dashboard, image uploads (images still come from `/public/images`; the Supabase `media` bucket is ready for Stage 3), Resend verification, Vercel/domain, Upstash.

## First administrator (for the upcoming admin phase)
Supabase -> Authentication -> Users -> Add user (email + password; no public sign-up exists). Then in the SQL Editor:
`insert into profiles (id, email, name, role) select id, email, 'Owner', 'admin' from auth.users where email = 'you@example.com';`

## Security notes
- Inquiries have **no public RLS policy**: the browser can never read or write them. Inserts happen only in the server route with the service-role key.
- Spam: honeypot field, 3-second time trap, 5 requests/hour/IP, payload size cap, server-side Zod validation, per-submission idempotency id.
- The in-memory rate limiter only protects a single server instance. On serverless/multi-instance hosting, replace it with a shared store (e.g. Upstash Redis).
- Email HTML escapes all user input.
- Legal pages are placeholders and must be written/reviewed by a legal professional.

## Structure
`messages/*.json` text · `src/content/site.ts` services/projects/testimonials · `src/lib/inquiry.ts` shared schema · `src/lib/email.ts` templates · `src/app/api/inquiries` · `supabase/migrations`

## Deploy
Any Node host (e.g. Vercel): set all variables from `.env.example` (with `NEXT_PUBLIC_SITE_URL` = your real domain), `npm run build`, `npm start`.

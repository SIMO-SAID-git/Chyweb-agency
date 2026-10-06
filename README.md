# Chyweb Digital Agency website

Next.js 14 (App Router) · TypeScript · Tailwind · next-intl (en / fr / ar, RTL) · Zod · Supabase (REST) · Resend.

## Status
| Area | State |
|---|---|
| Public site, 3 languages, service pages, portfolio filter, SEO | Done, tested |
| Multi-step inquiry form + `/api/inquiries` (validation, spam checks, DB insert, emails) | Done; tested against a local mock of Supabase/Resend. **Not yet tested against real Supabase/Resend.** |
| SQL schema + RLS + storage policies (`supabase/migrations/0001_init.sql`) | Written, syntax-checked; **not yet applied to a real database** |
| Admin login, dashboard, CMS (projects, services, testimonials, inquiries, media) | **Not built** |
| Public pages reading content from Supabase | **Not built** (pages still use `src/content/site.ts` + `messages/*.json`) |

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

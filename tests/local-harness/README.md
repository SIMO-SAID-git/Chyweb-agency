# Local integration harness (development only)

These are the automated tests used to build and verify the admin CMS **without** touching a real Supabase project. They are
**local tests**, not integration tests against your project. For your real project use `npm run verify:supabase` and
`npm run verify:admin` (see the main README).

What it does: starts a throw-away Postgres (pip package `pgserver`) with `supabase/migrations/*.sql` applied, a real PostgREST
binary (the same REST layer Supabase uses), and `gateway.py`, a small **test double** for Supabase Auth and Storage (it follows
their documented API, but it is NOT Supabase). It then drives the built site with Playwright.

| File | Covers |
|---|---|
| `adm_a.py` | anonymous access, login failures, token forgery, services + projects CRUD, public updates, slugs, concurrency |
| `adm_b1.py` | testimonials, FAQs, inquiries (search/filter/notes/read state), editor role, replayed server actions, RLS with each identity |
| `adm_b4.py` / `adm_b6.py` | token refresh and expiry, logout, secret scans |
| `adm_b5.py` | media upload/delete |
| `adm_c.py` | Stage 4: double-click protection, spoofed uploads, delete verification, SEO fields, previews, reordering |
| `down.py` | behaviour when the database is down |
| `app_tests.py` | public content suite (languages, publish/unpublish, fallbacks, sitemap) |
| `runall.sh` | runs everything |

Requirements: Linux, `pip install pgserver psycopg2-binary playwright` (+ `playwright install chromium`), the PostgREST release binary
at `/tmp/postgrest`, and the repo at `/home/claude/chyweb`. Paths (`/tmp`, `/home/claude/chyweb`) are hard-coded because this was built
for one sandbox; adjust them for another machine. A built site (`npm run build`) must be started on port 3150 pointing at the gateway
(`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3005`).

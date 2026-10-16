import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const AT = 'cw_at', RT = 'cw_rt';
const exp = (jwt: string) => { try { return Number(JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp) || 0; } catch { return 0; } };
const harden = (r: NextResponse) => { r.headers.set('Cache-Control', 'no-store'); r.headers.set('X-Robots-Tag', 'noindex, nofollow'); r.headers.set('X-Frame-Options', 'DENY'); r.headers.set('Referrer-Policy', 'same-origin'); return r; };
const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/admin' };

// /admin is NOT localized: it bypasses the EN/FR/AR router. It only gates + refreshes sessions; real authorization happens
// server-side on every page and action (src/lib/admin/session.ts) and in Postgres RLS.
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname !== '/admin' && !pathname.startsWith('/admin/')) return intl(req);
  const headers = new Headers(req.headers); headers.delete('x-cw-at'); // never trust a client-supplied copy
  const at = req.cookies.get(AT)?.value, rt = req.cookies.get(RT)?.value;
  const now = Date.now() / 1000;
  let fresh: { access_token: string; refresh_token: string; expires_in: number } | null = null;
  if (rt && (!at || exp(at) - now < 30)) {
    try {
      const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }), cache: 'no-store' });
      if (r.ok) fresh = await r.json();
    } catch { /* treated as expired */ }
    if (fresh) headers.set('x-cw-at', fresh.access_token);
  }
  const authed = Boolean(fresh) || Boolean(at && exp(at) > now);
  const isLogin = pathname === '/admin/login';
  if (!authed && !isLogin) {
    const res = NextResponse.redirect(new URL('/admin/login', req.url));
    res.cookies.delete({ name: AT, path: '/admin' }); res.cookies.delete({ name: RT, path: '/admin' });
    return harden(res);
  }
  const res = NextResponse.next({ request: { headers } });
  if (fresh) { res.cookies.set(AT, fresh.access_token, { ...cookieBase, maxAge: fresh.expires_in }); res.cookies.set(RT, fresh.refresh_token, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 }); }
  return harden(res);
}
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };

// Admin session handling (server only). Auth = Supabase Auth (password). The browser never sees a token: access/refresh
// tokens live in httpOnly cookies scoped to /admin. Every request is validated against Supabase Auth, then the staff
// profile (role) is read with the USER's own token, so authorization is enforced by Postgres RLS, not by this code alone.
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const AT = 'cw_at', RT = 'cw_rt';
export const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const userHeaders = (token?: string): Record<string, string> => ({ apikey: SB_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) });
export type Staff = { id: string; email: string; role: 'admin' | 'editor'; token: string };

export function setAuthCookies(t: { access_token: string; refresh_token: string; expires_in: number }) {
  const base = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/admin' };
  cookies().set(AT, t.access_token, { ...base, maxAge: t.expires_in });
  cookies().set(RT, t.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 7 });
}
export const clearAuthCookies = () => { cookies().delete({ name: AT, path: '/admin' }); cookies().delete({ name: RT, path: '/admin' }); };
// `x-cw-at` is set only by our middleware after a token refresh (it strips any client-supplied copy first).
const token = () => headers().get('x-cw-at') || cookies().get(AT)?.value || '';

export const getStaff = cache(async (): Promise<Staff | null> => {
  const t = token(); if (!t || !SB_URL) return null;
  // Invalid/expired session or missing profile => null (fail closed, user is sent to login).
  // Service outage (network error / 5xx) => THROW, so the admin sees "could not be loaded, try again" instead of a misleading login page.
  let u: Response;
  try { u = await fetch(`${SB_URL}/auth/v1/user`, { headers: userHeaders(t), cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { console.error('[admin] auth service unreachable'); throw new Error('Authentication service unreachable'); }
  if (u.status >= 500) { console.error('[admin] auth service error', u.status); throw new Error('Authentication service error'); }
  if (!u.ok) return null;
  const user = await u.json();
  let p: Response;
  try { p = await fetch(`${SB_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}`, { headers: userHeaders(t), cache: 'no-store', signal: AbortSignal.timeout(8000) }); }
  catch { console.error('[admin] database unreachable during session check'); throw new Error('Database unreachable'); }
  if (p.status >= 500) { console.error('[admin] database error during session check', p.status); throw new Error('Database error'); }
  if (!p.ok) return null;
  const [row] = await p.json();
  return row && (row.role === 'admin' || row.role === 'editor') ? { id: user.id, email: user.email, role: row.role, token: t } : null;
});
export async function requireStaff(): Promise<Staff> { const s = await getStaff(); if (!s) redirect('/admin/login'); return s; }
export async function requireAdmin(): Promise<Staff> { const s = await requireStaff(); if (s.role !== 'admin') redirect('/admin/forbidden'); return s; }

'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AT, SB_KEY, SB_URL, clearAuthCookies, setAuthCookies, userHeaders } from '@/lib/admin/session';
import { cookies } from 'next/headers';
import type { FormState } from '@/lib/admin/form';

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) }).safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!p.success) return { error: 'Enter a valid email address and password.' };
  let t: { access_token: string; refresh_token: string; expires_in: number; user: { id: string } };
  try {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(p.data), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { error: 'Invalid email or password.' }; // same message for unknown user / wrong password
    t = await r.json();
  } catch { return { error: 'Could not reach the authentication service. Try again.' }; }
  // Authorization: only accounts with a staff profile may enter. Checked with the user's own token (RLS).
  let rows: unknown[] = [];
  try {
    const pr = await fetch(`${SB_URL}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(t.user.id)}`, { headers: userHeaders(t.access_token), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (pr.status >= 500) return { error: 'The database is temporarily unavailable. Try again shortly.' };
    rows = pr.ok ? await pr.json() : [];
  } catch { return { error: 'The database is temporarily unavailable. Try again shortly.' }; }
  if (!rows.length) {
    await fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: userHeaders(t.access_token) }).catch(() => undefined);
    return { error: 'This account is not authorized to use the admin area.' };
  }
  setAuthCookies(t);
  const next = String(fd.get('next') ?? '');
  redirect(/^\/admin(\/[A-Za-z0-9_\-\/]*)?$/.test(next) && next !== '/admin/login' ? next : '/admin'); // safe redirect: /admin paths only
}
export async function logout() {
  const at = cookies().get(AT)?.value;
  if (at) await fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: userHeaders(at) }).catch(() => undefined);
  clearAuthCookies();
  redirect('/admin/login');
}

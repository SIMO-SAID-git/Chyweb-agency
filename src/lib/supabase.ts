// Server-only REST helper (service-role / secret key). NEVER import this from client components.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbConfigured = () => Boolean(url && key);
// New-style keys (sb_secret_..., sb_publishable_...) are opaque strings, not JWTs: send them ONLY in `apikey`
// (also sending them as a Bearer token is rejected as an invalid JWT). Legacy service_role JWTs use apikey + Bearer.
export const authHeaders = (k: string): Record<string, string> =>
  k.startsWith('sb_') ? { apikey: k } : { apikey: k, Authorization: `Bearer ${k}` };
export function db(path: string, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(8000), // never hang a serverless function on a slow database
    headers: { 'Content-Type': 'application/json', ...authHeaders(key!), ...(init.headers as Record<string, string>) },
  });
}

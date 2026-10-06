// Server-only REST helper. Uses the service-role key, which must NEVER be imported from client code.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbConfigured = () => Boolean(url && key);
export function db(path: string, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init, cache: 'no-store',
    headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
  });
}

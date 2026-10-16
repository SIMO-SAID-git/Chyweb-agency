// PostgREST calls made WITH THE LOGGED-IN USER'S TOKEN (never the service-role key): Row Level Security decides what is allowed.
import { SB_URL, userHeaders, type Staff } from './session';
export type Row = Record<string, any>; // eslint-disable-line
export class AdminError extends Error {
  constructor(public kind: 'forbidden' | 'conflict' | 'duplicate' | 'invalid' | 'notfound' | 'server', message: string) { super(message); }
}
type Opts = { method?: string; body?: unknown; prefer?: string; count?: boolean; range?: [number, number] };
function mapError(status: number, b: Row | null): AdminError {
  const code = b?.code as string | undefined;
  if (code === '23505') return new AdminError('duplicate', 'That slug or key is already in use. Choose a different one.');
  if (code === '23514' || code === '22P02' || code === '23502' || code === '22023') return new AdminError('invalid', 'The database rejected one of the values. Check the fields and try again.');
  if (code === '23503') return new AdminError('invalid', 'This record is still referenced by other data.');
  if (code === '42501' || status === 401 || status === 403) return new AdminError('forbidden', 'You do not have permission to do that (or your session expired). Sign in again.');
  console.error(`[admin] database error ${status} ${code ?? ''}`); // never log row content or tokens
  return new AdminError('server', 'Something went wrong while saving. Nothing was changed. Try again.');
}
export async function sb(s: Staff, path: string, o: Opts = {}): Promise<{ rows: Row[]; total?: number }> {
  const method = o.method ?? 'GET';
  const h: Record<string, string> = { ...userHeaders(s.token), 'Content-Type': 'application/json' };
  const prefer = [method !== 'GET' && method !== 'DELETE' ? 'return=representation' : '', o.count ? 'count=exact' : '', o.prefer ?? ''].filter(Boolean).join(',');
  if (prefer) h.Prefer = prefer;
  if (o.range) { h['Range-Unit'] = 'items'; h.Range = `${o.range[0]}-${o.range[1]}`; }
  let r: Response;
  try { r = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body), cache: 'no-store', signal: AbortSignal.timeout(10000) }); }
  catch { throw new AdminError('server', 'Could not reach the database. Try again in a moment.'); }
  const text = await r.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { /* empty */ } // eslint-disable-line
  if (!r.ok) throw mapError(r.status, j);
  const total = Number(r.headers.get('content-range')?.split('/')[1]);
  return { rows: Array.isArray(j) ? j : [], total: Number.isFinite(total) ? total : undefined };
}
export const enc = encodeURIComponent;
/** Insert (id === 'new') or update with optimistic concurrency: the row is only changed if nobody saved it since the form was loaded. */
export async function save(s: Staff, table: string, id: string, payload: Row, updatedAt: string): Promise<Row> {
  if (id === 'new') { const { rows } = await sb(s, table, { method: 'POST', body: payload }); return rows[0]; }
  const { rows } = await sb(s, `${table}?id=eq.${enc(id)}&updated_at=eq.${enc(updatedAt)}`, { method: 'PATCH', body: payload });
  if (!rows.length) throw new AdminError('conflict', 'This record was changed by someone else (or deleted) since you opened it. Reload the page and re-apply your edit.');
  return rows[0];
}
/** Make a many-to-many link table (service_projects) match the selected ids: remove unselected, add new, keep the rest. */
export async function syncLinks(s: Staff, ownCol: 'service_id' | 'project_id', ownId: string, otherCol: 'service_id' | 'project_id', ids: string[]) {
  const valid = Array.from(new Set(ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i))));
  const { rows } = await sb(s, `service_projects?select=${otherCol}&${ownCol}=eq.${enc(ownId)}`);
  const have = new Set(rows.map((r) => r[otherCol] as string));
  const drop = [...have].filter((x) => !valid.includes(x));
  if (drop.length) await sb(s, `service_projects?${ownCol}=eq.${enc(ownId)}&${otherCol}=in.(${drop.join(',')})`, { method: 'DELETE' });
  const add = valid.filter((x) => !have.has(x));
  if (add.length) await sb(s, 'service_projects?on_conflict=service_id,project_id', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: add.map((x, i) => ({ [ownCol]: ownId, [otherCol]: x, sort_order: (have.size + i + 1) * 10 })) });
}

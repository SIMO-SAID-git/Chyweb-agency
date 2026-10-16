import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { AdminError } from './db';
export type FormState = { ok?: boolean; error?: string; message?: string };
export const LANGS = ['en', 'fr', 'ar'] as const;
export const str = (fd: FormData, n: string) => String(fd.get(n) ?? '').trim();
export const bool = (fd: FormData, n: string) => fd.get(n) === 'on';
export const loc = (fd: FormData, n: string): Record<string, string> => Object.fromEntries(LANGS.map((l) => [l, str(fd, `${n}.${l}`)]).filter(([, v]) => v));
export const locLines = (fd: FormData, n: string): Record<string, string[]> =>
  Object.fromEntries(LANGS.map((l) => [l, str(fd, `${n}.${l}`).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)]).filter(([, v]) => (v as string[]).length));
export const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const uuid = z.string().uuid();
export const pathRe = /^(\/images\/[A-Za-z0-9._-]+|(?!.*\.\.)[a-z]+\/[A-Za-z0-9._\/-]+)$/; // static asset or storage path; no URLs, no "..".
export const zloc = (max: number, requireEn: boolean, label: string) => z.record(z.enum(LANGS), z.string().max(max, `${label}: at most ${max} characters per language`))
  .refine((o) => !requireEn || !!o.en, `${label}: English text is required`);
export const zlines = (label: string) => z.record(z.enum(LANGS), z.array(z.string().max(200, `${label}: each line at most 200 characters`)).max(12, `${label}: at most 12 lines`));
export const orNull = <T extends object>(o: T) => (Object.keys(o).length ? o : null);
export const zmsg = (e: z.ZodError) => e.issues.map((i) => i.message).filter((m, k, a) => a.indexOf(m) === k).join(' · ');
/** Turn any thrown value into a user-facing FormState; Next's redirect() signal must pass through. */
export function fail(e: unknown): FormState {
  if (isRedirectError(e)) throw e;
  if (e instanceof AdminError) return { error: e.message };
  console.error('[admin] unexpected error', (e as Error)?.message);
  return { error: 'Unexpected error. Nothing was changed.' };
}

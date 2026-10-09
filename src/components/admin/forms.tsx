'use client';
import { useState, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/admin/form';

export const inputCls = 'w-full rounded-lg border bg-navy/60 px-3 py-2 text-sm text-white placeholder:text-muted/50 focus:border-cyan';
export function Submit({ label, danger }: { label: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${danger ? 'border border-red-400/50 text-red-300 hover:bg-red-400/10' : 'bg-cyan text-navy hover:bg-cyan-bright'}`}>{pending ? 'Working…' : label}</button>;
}
export function AdminForm({ action, children, submit = 'Save' }: { action: (p: FormState, f: FormData) => Promise<FormState>; children: ReactNode; submit?: string }) {
  const [result, formAction] = useFormState(action, {} as FormState);
  const state: FormState = result ?? {}; // a successful save redirects, leaving the action result undefined
  return (
    <form action={formAction} className="space-y-6">
      {children}
      {state.error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg border border-cyan/40 bg-cyan/10 p-3 text-sm text-cyan">{state.message}</p>}
      <Submit label={submit} />
    </form>
  );
}
export function ConfirmSubmit({ label, message, danger = true }: { label: string; message: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }} className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-60 ${danger ? 'border border-red-400/50 text-red-300 hover:bg-red-400/10' : 'border text-white hover:border-cyan'}`}>{label}</button>;
}
// One field in three languages. All three inputs are always in the form (inactive tabs are only hidden), so editing one
// language can never wipe another. A dot on a tab means that language is empty (it will fall back to English on the website).
const NAMES = { en: 'English', fr: 'Français', ar: 'العربية' } as const;
export function LocalizedInput({ name, label, values = {}, rows = 1, required, hint }: { name: string; label: string; values?: Record<string, string>; rows?: number; required?: boolean; hint?: string }) {
  const [tab, setTab] = useState<'en' | 'fr' | 'ar'>('en');
  const [v, setV] = useState<Record<string, string>>(values);
  return (
    <fieldset className="rounded-xl border p-4">
      <legend className="px-2 text-sm font-medium">{label}{required && <span className="text-cyan"> *</span>}</legend>
      <div role="tablist" aria-label={`${label} language`} className="mb-3 flex gap-2">
        {(['en', 'fr', 'ar'] as const).map((l) => (
          <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} className={`rounded-full border px-3 py-1 text-xs ${tab === l ? 'border-cyan bg-cyan/10 text-cyan' : 'text-muted'}`}>
            {NAMES[l]}{!v[l]?.trim() && <span title="No translation yet (falls back to English)" className="ms-1 text-amber-300">•</span>}
          </button>
        ))}
      </div>
      {(['en', 'fr', 'ar'] as const).map((l) => (
        <div key={l} hidden={tab !== l}>
          {rows > 1
            ? <textarea name={`${name}.${l}`} rows={rows} value={v[l] ?? ''} onChange={(e) => setV({ ...v, [l]: e.target.value })} dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l} className={inputCls} aria-label={`${label} (${NAMES[l]})`} />
            : <input name={`${name}.${l}`} value={v[l] ?? ''} onChange={(e) => setV({ ...v, [l]: e.target.value })} dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l} className={inputCls} aria-label={`${label} (${NAMES[l]})`} />}
        </div>
      ))}
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

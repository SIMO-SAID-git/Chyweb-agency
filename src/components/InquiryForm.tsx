'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { budgets, inquirySchema, projectTypes, serviceKeys, stepFields, timelines } from '@/lib/inquiry';

type V = { name: string; email: string; phone: string; company: string; country: string; projectType: string; service: string; description: string; objectives: string; existingUrl: string; budget: string; timeline: string; extra: string; consent: boolean };
const empty: V = { name: '', email: '', phone: '', company: '', country: '', projectType: '', service: '', description: '', objectives: '', existingUrl: '', budget: '', timeline: '', extra: '', consent: false };
const input = 'w-full rounded-lg border bg-navy/60 px-4 py-3 text-base text-white placeholder:text-muted/50 focus:border-cyan';

export default function InquiryForm() {
  const t = useTranslations('form');
  const s = useTranslations('services');
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<V>(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errKey, setErrKey] = useState('server');
  const [res, setRes] = useState<{ reference: string; client: boolean } | null>(null);
  const started = useRef(Date.now());
  const sid = useRef('');
  const hp = useRef<HTMLInputElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const steps = t.raw('steps') as string[];

  useEffect(() => { // prefill service from ?service=... (set by "Discuss this service")
    const sv = new URLSearchParams(window.location.search).get('service');
    if (sv && (serviceKeys as readonly string[]).includes(sv)) setV((p) => ({ ...p, service: sv }));
  }, []);
  useEffect(() => { if (mounted.current) head.current?.focus(); mounted.current = true; }, [step, state]);

  const set = (k: keyof V, val: string | boolean) => { setV((p) => ({ ...p, [k]: val })); setErrs((p) => { const n = { ...p }; delete n[k]; return n; }); };
  const validate = (idx: number) => {
    const r = inquirySchema.safeParse(v); const e: Record<string, string> = {};
    if (!r.success) for (const i of r.error.issues) { const k = String(i.path[0]); if (stepFields[idx].includes(k) && !e[k]) e[k] = i.message; }
    setErrs(e);
    const first = Object.keys(e)[0];
    if (first) setTimeout(() => document.getElementById(`f-${first}`)?.focus(), 0);
    return !first;
  };
  const next = () => { if (validate(step)) setStep(step + 1); };
  const submit = async () => {
    for (let i = 0; i < 4; i++) if (!validate(i)) { setStep(i); return; }
    if (state === 'sending') return; // duplicate-click guard
    setState('sending');
    sid.current ||= crypto.randomUUID(); // same id on retry -> server de-duplicates
    try {
      const r = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, lang: locale, submissionId: sid.current, website: hp.current?.value ?? '', startedAt: started.current }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setRes({ reference: j.reference, client: Boolean(j.emails?.client) }); setState('done'); return; }
      setErrKey(r.status === 503 ? 'config' : r.status === 429 ? 'rate' : 'server'); setState('error');
    } catch { setErrKey('server'); setState('error'); }
  };

  const label = (k: string, req = true) => <label htmlFor={`f-${k}`} className="mb-2 block text-sm font-medium">{t(`f.${k}`)}{!req && <span className="ms-2 text-muted"> ({t('optional')})</span>}</label>;
  const err = (k: string) => errs[k] ? <p id={`e-${k}`} role="alert" className="mt-2 text-sm text-red-300">{t(`err.${errs[k]}`)}</p> : null;
  const aria = (k: string, hint?: boolean) => ({ id: `f-${k}`, 'aria-invalid': errs[k] ? true : undefined, 'aria-describedby': [errs[k] && `e-${k}`, hint && `h-${k}`].filter(Boolean).join(' ') || undefined });
  const text = (k: keyof V, type = 'text', req = true, hint = false) => (
    <div>{label(k, req)}<input {...aria(k, hint)} type={type} value={v[k] as string} onChange={(e) => set(k, e.target.value)} className={input}
      dir={type === 'email' || type === 'tel' || type === 'url' ? 'ltr' : undefined} autoComplete={k === 'name' ? 'name' : k === 'email' ? 'email' : k === 'phone' ? 'tel' : k === 'company' ? 'organization' : k === 'country' ? 'country-name' : 'off'} />
      {hint && <p id={`h-${k}`} className="mt-2 text-sm text-muted">{t(`hint.${k}`)}</p>}{err(k)}</div>);
  const area = (k: keyof V, req = true, hint = false, rows = 4) => (
    <div>{label(k, req)}<textarea {...aria(k, hint)} rows={rows} value={v[k] as string} onChange={(e) => set(k, e.target.value)} className={input} />
      {hint && <p id={`h-${k}`} className="mt-2 text-sm text-muted">{t(`hint.${k}`)}</p>}{err(k)}</div>);
  const sel = (k: keyof V, opts: [string, string][], hint = false) => (
    <div>{label(k)}<select {...aria(k, hint)} value={v[k] as string} onChange={(e) => set(k, e.target.value)} className={input}>
      <option value="">{t('choose')}</option>{opts.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select>
      {hint && <p id={`h-${k}`} className="mt-2 text-sm text-muted">{t(`hint.${k}`)}</p>}{err(k)}</div>);
  const svcLabel = (k: string) => (k === 'unsure' ? t('sv.unsure') : s(`items.${k}.t`));
  const svcOpts: [string, string][] = serviceKeys.map((k) => [k, svcLabel(k)]);
  const ptOpts: [string, string][] = projectTypes.map((k) => [k, t(`pt.${k}`)]);
  const bdOpts: [string, string][] = budgets.map((k) => [k, t(`bd.${k}`)]);
  const tlOpts: [string, string][] = timelines.map((k) => [k, t(`tl.${k}`)]);

  if (state === 'done' && res) return (
    <div role="status" className="rounded-2xl border border-cyan/40 bg-navy/60 p-8">
      <h2 ref={head} tabIndex={-1} className="text-2xl font-bold outline-none">{t('ok.title')}</h2>
      <p className="mt-4 text-muted">{t('ok.ref')}: <strong dir="ltr" className="text-cyan">{res.reference}</strong></p>
      <p className="mt-3 text-muted">{res.client ? t('ok.sent', { email: v.email }) : t('ok.notSent')}</p>
      <p className="mt-3 text-muted">{t('ok.next')}</p>
    </div>);

  const rows: [number, string, string][] = [
    [0, t('f.name'), v.name], [0, t('f.email'), v.email], [0, t('f.phone'), v.phone], [0, t('f.company'), v.company], [0, t('f.country'), v.country],
    [1, t('f.projectType'), v.projectType && t(`pt.${v.projectType}`)], [1, t('f.service'), v.service && svcLabel(v.service)], [1, t('f.description'), v.description], [1, t('f.objectives'), v.objectives], [1, t('f.existingUrl'), v.existingUrl],
    [2, t('f.budget'), v.budget && t(`bd.${v.budget}`)], [2, t('f.timeline'), v.timeline && t(`tl.${v.timeline}`)], [2, t('f.extra'), v.extra]];

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < 3) next(); else void submit(); }} className="rounded-2xl border bg-navy/60 p-6 sm:p-8">
      <ol className="mb-6 flex gap-2" aria-label={steps.join(', ')}>
        {steps.map((n, i) => <li key={n} aria-current={i === step ? 'step' : undefined} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-cyan' : 'bg-white/15'}`}><span className="sr-only">{n}</span></li>)}
      </ol>
      <p className="text-sm text-muted">{t('step', { n: step + 1, total: 4 })}</p>
      <h2 ref={head} tabIndex={-1} className="mb-6 mt-1 text-2xl font-bold outline-none">{steps[step]}</h2>
      <input ref={hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 opacity-0" />
      <div className="grid gap-5">
        {step === 0 && <>{text('name')}{text('email', 'email')}{text('phone', 'tel', false)}{text('company', 'text', false)}{text('country', 'text', false)}</>}
        {step === 1 && <>{sel('projectType', ptOpts)}{sel('service', svcOpts)}{area('description', true, true, 5)}{area('objectives', false, false, 3)}{text('existingUrl', 'url', false, true)}</>}
        {step === 2 && <>{sel('budget', bdOpts, true)}{sel('timeline', tlOpts)}{area('extra', false, false, 4)}</>}
        {step === 3 && <>
          <dl className="divide-y rounded-xl border">{rows.filter((r) => r[2]).map(([i, k, val]) => (
            <div key={k} className="flex items-start justify-between gap-4 p-4"><div className="min-w-0"><dt className="text-xs uppercase tracking-wider text-muted">{k}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{val}</dd></div>
              <button type="button" onClick={() => setStep(i)} className="shrink-0 text-sm font-semibold text-cyan">{t('edit')}</button></div>))}</dl>
          <p className="text-sm text-muted">{t('notice')}</p>
          <div><label className="flex items-start gap-3 text-sm"><input {...aria('consent')} type="checkbox" checked={v.consent} onChange={(e) => set('consent', e.target.checked)} className="mt-1 h-4 w-4 accent-[#00E0E0]" />
            <span>{t('consent')} <Link href="/privacy-policy" className="text-cyan underline" target="_blank">{t('privacyLink')}</Link></span></label>{err('consent')}</div>
        </>}
      </div>
      {state === 'error' && <p role="alert" className="mt-6 rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">{t(`err.${errKey}`)}</p>}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold transition hover:border-cyan disabled:invisible">{t('back')}</button>
        {step < 3 ? <button type="submit" className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-navy transition hover:bg-cyan-bright">{t('next')}</button>
          : <button type="submit" disabled={state === 'sending'} className="rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-navy transition hover:bg-cyan-bright disabled:opacity-60">{state === 'sending' ? t('submitting') : t('submit')}</button>}
      </div>
    </form>
  );
}

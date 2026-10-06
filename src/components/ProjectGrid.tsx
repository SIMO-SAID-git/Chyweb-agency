'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectCard } from './Cards';
import type { projects } from '@/content/site';
type P = (typeof projects)[number];
export default function ProjectGrid({ items }: { items: readonly P[] }) {
  const t = useTranslations('portfolio');
  const [cat, setCat] = useState('all');
  const cats = Array.from(new Set(items.map((p) => p.key)));
  const shown = cat === 'all' ? items : items.filter((p) => p.key === cat);
  const btn = (k: string, label: string) => (
    <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}
      className={`rounded-full border px-4 py-2 text-sm transition ${cat === k ? 'border-cyan bg-cyan text-navy' : 'text-muted hover:border-cyan/50 hover:text-white'}`}>{label}</button>
  );
  return (
    <>
      <div role="group" aria-label={t('filter')} className="flex flex-wrap gap-2">{btn('all', t('all'))}{cats.map((k) => btn(k, t(`items.${k}.c`)))}</div>
      <div key={cat} className="fade-in mt-8 grid gap-6 md:grid-cols-2">{shown.map((p) => <ProjectCard key={p.slug} p={p} />)}</div>
    </>
  );
}

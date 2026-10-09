import Link from 'next/link';
import type { ReactNode } from 'react';
import { logout } from '@/app/admin/login/actions';
import { ConfirmSubmit, inputCls } from './forms';
import type { Staff } from '@/lib/admin/session';

export function AdminNav({ staff }: { staff: Staff }) {
  const links: [string, string, boolean][] = [['/admin', 'Dashboard', true], ['/admin/services', 'Services', true], ['/admin/projects', 'Projects', true], ['/admin/testimonials', 'Testimonials', true], ['/admin/faqs', 'FAQs', true], ['/admin/media', 'Media', true], ['/admin/inquiries', 'Inquiries', staff.role === 'admin']];
  return (
    <aside className="border-b bg-navy md:min-h-screen md:w-56 md:border-b-0 md:border-e">
      <div className="p-5"><Link href="/admin" className="text-lg font-bold">Chy<span className="text-cyan">web</span> <span className="text-xs font-normal text-muted">admin</span></Link></div>
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {links.filter((l) => l[2]).map(([h, t]) => <Link key={h} href={h} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-cyan">{t}</Link>)}
      </nav>
      <div className="p-5 text-xs text-muted">
        <p className="truncate">{staff.email}</p><p className="mb-3 capitalize">{staff.role}</p>
        <form action={logout}><ConfirmSubmit label="Sign out" message="Sign out of the admin?" danger={false} /></form>
      </div>
    </aside>
  );
}
export const PageTitle = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{title}</h1>{action}</div>
);
export const Flash = ({ ok, err }: { ok?: string; err?: string }) => (
  <>{ok && <p role="status" className="mb-6 rounded-lg border border-cyan/40 bg-cyan/10 p-3 text-sm text-cyan">{ok}</p>}
  {err && <p role="alert" className="mb-6 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">{err}</p>}</>
);
export const Badge = ({ on, yes = 'Published', no = 'Draft' }: { on: boolean; yes?: string; no?: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs ${on ? 'bg-cyan/15 text-cyan' : 'bg-white/10 text-muted'}`}>{on ? yes : no}</span>
);
export const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted">{children}</p>;
export const Field = ({ label, name, defaultValue, type = 'text', required, hint, list, readOnly, rows }: { label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; hint?: string; list?: string; readOnly?: boolean; rows?: number }) => (
  <div><label htmlFor={`f-${name}`} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-cyan"> *</span>}</label>
    {rows ? <textarea id={`f-${name}`} name={name} defaultValue={defaultValue ?? ''} rows={rows} className={inputCls} /> : <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ''} required={required} list={list} readOnly={readOnly} className={`${inputCls} ${readOnly ? 'opacity-60' : ''}`} />}
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
);
export const Check = ({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) => (
  <div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#00E0E0]" />{label}</label>{hint && <p className="ms-6 mt-1 text-xs text-muted">{hint}</p>}</div>
);
export const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="border-b bg-white/5 text-xs uppercase tracking-wider text-muted"><tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div>
);
import { setPublished } from '@/app/admin/actions';
export function PublishToggle({ table, id, published }: { table: string; id: string; published: boolean }) {
  return (
    <form action={setPublished} className="inline">
      <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /><input type="hidden" name="value" value={published ? '0' : '1'} />
      <button type="submit" className="rounded-full border px-3 py-1 text-xs hover:border-cyan hover:text-cyan">{published ? 'Unpublish' : 'Publish'}</button>
    </form>
  );
}
export const LinkBoxes = ({ items, selected, name = 'link' }: { items: { id: string; label: string }[]; selected: string[]; name?: string }) => (
  <div className="grid gap-2 sm:grid-cols-2">{items.length === 0 ? <p className="text-sm text-muted">Nothing to link yet.</p> : items.map((i) => (
    <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} className="h-4 w-4 accent-[#00E0E0]" />{i.label}</label>))}</div>
);

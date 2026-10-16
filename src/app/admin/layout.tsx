import type { Metadata } from 'next';
import '../globals.css';
import { AdminNav } from '@/components/admin/ui';
import { getStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: { default: 'Chyweb Admin', template: '%s · Chyweb Admin' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let staff = null;
  try { staff = await getStaff(); } catch { /* outage: render without navigation; the page's own error boundary explains it */ }
  return (
    <html lang="en" dir="ltr"><body>
      {staff ? <div className="min-h-screen md:flex"><AdminNav staff={staff} /><main className="min-w-0 flex-1 p-5 md:p-10">{children}</main></div> : <main>{children}</main>}
    </body></html>
  );
}

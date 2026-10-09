import Link from 'next/link';
export const metadata = { title: 'Not allowed' };
export default function Forbidden() {
  return <div className="mx-auto max-w-md pt-24 text-center"><h1 className="text-2xl font-bold">403: Not allowed</h1><p className="mt-3 text-muted">Your account does not have permission to view this page.</p><Link href="/admin" className="mt-6 inline-block text-cyan">Back to dashboard</Link></div>;
}

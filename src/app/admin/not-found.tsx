import Link from 'next/link';
export default function AdminNotFound() {
  return <div className="mx-auto max-w-md pt-24 text-center"><h1 className="text-2xl font-bold">Not found</h1><p className="mt-3 text-muted">That record does not exist (it may have been deleted).</p><Link href="/admin" className="mt-6 inline-block text-cyan">Back to dashboard</Link></div>;
}

'use client';
// Shown when an admin page fails to load (for example the database is unreachable). No technical details are exposed.
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-400/40 bg-red-400/10 p-6">
      <h1 className="text-lg font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-red-100">The database or your session may be temporarily unavailable. Nothing was changed. Try again, or sign in again if the problem continues.</p>
      <div className="mt-4 flex gap-3"><button onClick={reset} className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-navy">Try again</button><a href="/admin/login" className="rounded-full border px-4 py-2 text-sm">Sign in again</a></div>
    </div>
  );
}

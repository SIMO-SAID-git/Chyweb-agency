import { AdminForm } from '@/components/admin/forms';
import { Field } from '@/components/admin/ui';
import { login } from './actions';
export const metadata = { title: 'Sign in' };
export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-sm rounded-2xl border bg-navy/60 p-8">
        <p className="text-xl font-bold">Chy<span className="text-cyan">web</span> <span className="text-sm font-normal text-muted">admin</span></p>
        <h1 className="mb-6 mt-4 text-lg font-semibold">Sign in</h1>
        <AdminForm action={login} submit="Sign in">
          <input type="hidden" name="next" value={searchParams.next ?? ''} />
          <Field label="Email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
        </AdminForm>
      </div>
    </div>
  );
}

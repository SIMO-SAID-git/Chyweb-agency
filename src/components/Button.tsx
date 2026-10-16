import { Link } from '@/i18n/routing';
import type { ComponentProps } from 'react';
export default function Button({ variant = 'primary', className = '', ...p }: ComponentProps<typeof Link> & { variant?: 'primary' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-200 active:scale-[0.98]';
  const v = variant === 'primary' ? 'bg-cyan text-navy hover:bg-cyan-bright' : 'border border-white/25 text-white hover:border-cyan hover:text-cyan';
  return <Link {...p} className={`${base} ${v} ${className}`} />;
}
export const Arrow = () => <span aria-hidden className="rtl:rotate-180">→</span>;

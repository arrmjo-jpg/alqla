'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

export function NotFoundButtons() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-white transition hover:opacity-90 cursor-pointer"
      >
        <Home className="size-4" />
        <span>العودة للرئيسية</span>
      </button>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-5 py-2.5 font-bold text-fg transition hover:bg-surface-3 cursor-pointer"
      >
        <ArrowLeft className="size-4" />
        <span>الرجوع للخلف</span>
      </button>
    </div>
  );
}

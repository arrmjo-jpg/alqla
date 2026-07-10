import type { Metadata } from 'next';
import Link from 'next/link';
import { Clapperboard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الريلز غير موجود - AlphaCMS',
  robots: { index: false, follow: true },
};

// 404 مُخصَّص لمجموعة الريلز — بسيط ومتناسق مع قشرة الريلز الداكنة/الفاتحة (متغيّرات --rl-*)
// عوضاً عن تصميم (site)/not-found.tsx الغنيّ (يعتمد سايدبار/تصنيفات الموقع العامّة غير المتوفّرة هنا).
export default function ReelsNotFound() {
  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 py-16 text-center"
      style={{ color: 'var(--rl-fg)' }}
      dir="rtl"
    >
      <div
        className="flex size-16 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--rl-panel)', color: 'var(--rl-muted)' }}
      >
        <Clapperboard className="size-8" />
      </div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">هذا الريل غير موجود</h1>
      <p className="max-w-md text-sm font-medium leading-relaxed" style={{ color: 'var(--rl-muted)' }}>
        رُبَّما حُذف الريل الذي تبحث عنه أو لم يعد متاحاً. تصفَّح بقيّة الريلز من هنا.
      </p>
      <Link
        href="/reels"
        className="mt-2 rounded-lg px-5 py-2.5 font-bold transition hover:opacity-90"
        style={{ backgroundColor: 'var(--rl-fg)', color: 'var(--rl-bg)' }}
      >
        تصفّح الريلز
      </Link>
    </div>
  );
}

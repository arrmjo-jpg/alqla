'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { NotFoundButtons } from '@/components/ui/not-found-buttons';

// حدّ خطأ جذريّ — يلتقط أيّ خطأ غير مُلتقَط في أيّ مسار لا يملك error.tsx خاصّاً به (كلّها حالياً:
// لا يوجد error.tsx آخر في المشروع). لا يغطّي أخطاء app/layout.tsx نفسه — يلزمها global-error.tsx.
export default function GlobalErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-4 py-16 text-center" dir="rtl">
      <div className="flex size-16 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="font-heading text-2xl font-extrabold text-fg sm:text-3xl">حدث خطأ غير متوقَّع</h1>
      <p className="max-w-md text-sm font-medium leading-relaxed text-muted">
        نعتذر عن الإزعاج — واجهت الصفحة مشكلةً أثناء التحميل. حاول مجدَّداً أو عُد للرئيسية.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 font-bold text-white transition hover:opacity-90"
        >
          إعادة المحاولة
        </button>
      </div>
      <NotFoundButtons />
    </div>
  );
}

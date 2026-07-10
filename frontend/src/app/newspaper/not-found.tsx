import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper } from 'lucide-react';

export const metadata: Metadata = {
  title: 'العدد غير موجود - AlphaCMS',
  robots: { index: false, follow: true },
};

// 404 مُخصَّص لقارئ الجريدة الرقميّة — newspaper/ بلا layout.tsx خاصّ (القشرة الجذريّة فقط)،
// فتصميم بسيط ومستقلّ هنا بدل استعارة (site)/not-found.tsx الغنيّ (سايدبار/تصنيفات غير متوفّرة).
export default function NewspaperNotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 bg-bg px-4 py-16 text-center text-fg" dir="rtl">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Newspaper className="size-8" />
      </div>
      <h1 className="font-heading text-2xl font-extrabold sm:text-3xl">هذا العدد غير موجود</h1>
      <p className="max-w-md text-sm font-medium leading-relaxed text-muted">
        رُبَّما لم يُنشر هذا العدد من النسخة الورقيّة أو حُذف. تصفَّح كلّ الأعداد المتاحة من الأرشيف.
      </p>
      <Link
        href="/epaper"
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-white transition hover:opacity-90"
      >
        أرشيف الجريدة الرقميّة
      </Link>
    </div>
  );
}

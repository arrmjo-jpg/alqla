import Link from 'next/link';

import { cn } from '@/lib/utils';

// أيقونة ثلاثيّة الشيفرون («>>>») — تشير دائمًا لليمين بصريًّا (لا تنعكس مع RTL، بعكس نصّ ">>>" الذي قد
// ينعكس بخوارزميّة bidi). تُستخدم في كلّ روابط «المزيد» بالموقع (عربي/إنجليزي) وفق طلب العميل الصريح.
export function TripleChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 4l8 8-8 8" />
      <path d="M13 4l8 8-8 8" />
      <path d="M23 4l8 8-8 8" />
    </svg>
  );
}

// رابط «المزيد» الموحّد لكلّ ترويسات الأقسام — نصّ + شيفرون ثلاثيّ. يُوضَع داخل حاوية `justify-between` مع
// العنوان (flex-row الذي يعكس اتّجاهه تلقائيًّا حسب `dir`، فيهبط الرابط على الطرف المقابل للعنوان بلا شرط لغة).
// Hover خفيف فقط: أوباسيتي + انزياح أفقيّ 2-4px + مؤشّر يد — بلا أي حركة صاخبة.
export function SectionMoreLink({
  href,
  label = 'المزيد',
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-muted transition-[color,transform,opacity] duration-200 hover:translate-x-1 hover:text-primary hover:opacity-90',
        className,
      )}
    >
      <span>{label}</span>
      <TripleChevron className="size-4" />
    </Link>
  );
}

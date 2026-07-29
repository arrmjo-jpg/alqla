import Link from 'next/link';

import { TripleChevron } from '@/components/ui/section-more-link';
import type { FeedItem } from '@/lib/feed';

// قائمة «آخر المستجدات» (علم is_header، من كلّ الموقع) — تحلّ محلّ الإعلان بجانب الهيرو (٣ أعمدة).
// نفس تصميم «Premium Light Design» المستخدم لأقسام الكُتّاب في TrendingLatestMostRead، لكن بعنوان
// ثابت (لا اسم قسم) ورابط «المزيد» إلى /latest. لا عناصر ⇒ يُخفى (يترك العمود فارغًا بجانب الهيرو).
export function LatestHeaderList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] bg-surface p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-red-400" />

      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/50 pb-4 pt-1">
        <h2 className="font-heading text-lg font-extrabold text-primary">آخر المستجدات</h2>
        <Link
          href="/latest"
          className="group flex items-center gap-1 text-xs font-bold text-muted transition-[color,transform] hover:translate-x-1 hover:text-primary"
        >
          <span>المزيد</span>
          <TripleChevron className="size-3" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {items.slice(0, 6).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-4 border-b border-border/40 py-3.5 last:border-0 transition-colors hover:bg-surface-2/60"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="line-clamp-2 text-[14px] font-bold leading-[1.5] text-fg transition-colors group-hover:text-primary">
                {item.title}
              </h3>
              {item.category && (
                <span className="mt-1.5 text-xs font-extrabold text-primary/80">{item.category}</span>
              )}
            </div>

            <div className="relative h-[68px] w-[90px] shrink-0 overflow-hidden rounded-[10px] bg-surface-2 shadow-sm ring-1 ring-black/5 transition-all group-hover:ring-primary/20">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />
              ) : (
                <div className="size-full bg-surface-3" aria-hidden />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

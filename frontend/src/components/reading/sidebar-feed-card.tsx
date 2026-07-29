import Link from 'next/link';

import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// بطاقة شريط جانبيّ عامّة (زاوية خاصة/الرائج) — نفس لغة تبويبات NewsTabs (صورة 4:3 + عنوان سطرين +
// تاريخ نسبيّ)، برأس أحمر مضغوط مناسب لعرض العمود الجانبيّ الضيّق. لا عناصر ⇒ يُخفى (لا بطاقة فارغة).
export function SidebarFeedCard({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: FeedItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-primary bg-primary px-3 py-2">
        {href ? (
          <Link href={href} className="text-sm font-extrabold text-white transition-opacity hover:opacity-90">
            {title}
          </Link>
        ) : (
          <span className="text-sm font-extrabold text-white">{title}</span>
        )}
        {href && (
          <Link href={href} className="text-xs font-bold text-white/85 hover:text-white">
            المزيد
          </Link>
        )}
      </div>

      <ol className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="group flex gap-3 p-3 transition-colors hover:bg-surface-2">
              <div className="aspect-[4/3] w-16 shrink-0 overflow-hidden bg-surface-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود (سياسة صور الواجهة)
                  <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-surface-3" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary">
                  {item.title}
                </h4>
                {item.publishedAt && (
                  <time dateTime={item.publishedAt} className="mt-1 block text-caption text-muted">
                    {formatRelativeTime(item.publishedAt)}
                  </time>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

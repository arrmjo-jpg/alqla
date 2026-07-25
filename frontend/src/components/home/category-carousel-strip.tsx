import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// شبكة ثابتة (بلا تمرير/أسهم) — تعرض العناصر كما وصلت (العدد يُضبط من المستدعي، غالبًا 4).
// بألوان الموقع (توكنز fg/surface/border + الأحمر primary). يُستهلَك من CategoryCarousel.
export function CategoryCarouselStrip({ items }: { items: FeedItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <CarouselCard key={item.id} item={item} />
      ))}
    </div>
  );
}

// بطاقة الكورسل — صورة 16:9 + عنوان سطرين + تاريخ نسبيّ. رابط الخبر يغطّي البطاقة (الربط بمعرّف الخبر في المسار).
function CarouselCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative w-full">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم (لا next/image)
          <img
            src={item.image}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
        {/* تاج «تغطية خاصة»/«عاجل» — يظهر على كلّ بطاقة في كلّ الأقسام عند توفّر العلم. */}
        <FeedBadge badge={item.badge} />
      </div>

      <div className="pt-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[15px]">
          {item.title}
        </h3>
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="mt-2 block text-xs font-medium text-muted">
            {formatRelativeTime(item.publishedAt)}
          </time>
        )}
      </div>
    </article>
  );
}

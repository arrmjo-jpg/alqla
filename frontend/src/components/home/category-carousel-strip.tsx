'use client';

import Link from 'next/link';
import { useRef } from 'react';

import { FeedBadge } from '@/components/home/featured-hero';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// شريط الكورسل (تمرير أفقيّ RTL + أزرار ظاهرة دائمًا) — **تمرير يدويّ فقط** (أسهم/سحب باللمس، بلا أوتوبلاي).
// بألوان الموقع (توكنز fg/surface/border + الأحمر primary). يُستهلَك من CategoryCarousel.
export function CategoryCarouselStrip({ items }: { items: FeedItem[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  // RTL: «التالي» (للأمام) = يسار = scrollBy سالب؛ «السابق» (للخلف) = يمين = scrollBy موجب.
  const scroll = (dir: 1 | -1) => stripRef.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  return (
    <div className="group/strip relative">
      {/* السابق — على اليمين في RTL بسهمٍ يمينيّ (اتّجاه الرجوع). z-20 ليطغى على غطاء رابط البطاقة؛ ظاهرٌ دائمًا ليعمل باللمس. */}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="السابق"
        className="absolute -start-2 top-[28%] z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-surface text-fg shadow-lg ring-1 ring-border transition hover:bg-primary hover:text-white active:scale-95"
        style={{ borderRadius: '9999px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {/* التالي — على اليسار في RTL بسهمٍ يساريّ (اتّجاه التقدّم). */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="التالي"
        className="absolute -end-2 top-[28%] z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-surface text-fg shadow-lg ring-1 ring-border transition hover:bg-primary hover:text-white active:scale-95"
        style={{ borderRadius: '9999px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        ref={stripRef}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <CarouselCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// بطاقة الكورسل — صورة 16:9 + عنوان سطرين + تاريخ نسبيّ. رابط الخبر يغطّي البطاقة (الربط بمعرّف الخبر في المسار).
function CarouselCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative w-[280px] shrink-0 sm:w-[300px]">
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

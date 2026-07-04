'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { LivePulse } from '@/components/ui/live-pulse';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// كاروسيل الهيرو على الجوّال — شريحة واحدة بملء العرض في كلّ مرّة، سحب أصبعيّ أصيل (scroll-snap)،
// ونقاط ترقيم تتبع الشريحة النشطة عبر IntersectionObserver (محايد للاتجاه، يعمل في RTL). صور <img>
// (حارس أداء الهوم) بـ object-cover بلا تشويه. الشريحة الأولى eager لأجل LCP. يظهر دون 1024px فقط.
export function HeroMobileCarousel({ items }: { items: FeedItem[] }) {
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = Number((e.target as HTMLElement).dataset.idx);
          }
        }
        if (best >= 0 && bestRatio >= 0.5) setActive(best);
      },
      { root: scroller, threshold: [0.5, 0.75, 1] },
    );
    for (const el of slidesRef.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  const goTo = (i: number) => {
    slidesRef.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <div className="lg:hidden">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={(el) => {
              slidesRef.current[i] = el;
            }}
            data-idx={i}
            className="w-full shrink-0 snap-center"
          >
            <HeroSlide item={item} priority={i === 0} />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`الانتقال إلى الخبر ${i + 1}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroSlide({ item, priority }: { item: FeedItem; priority: boolean }) {
  return (
    <div
      className="group relative block aspect-[4/3] max-h-[480px] w-full overflow-hidden bg-surface-2 sm:aspect-[16/9]"
      style={{ borderRadius: '15px' }}
    >
      {/* رابط الخبر يغطّي الكرت كاملاً */}
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      <OptimizedImage
        cover={item.cover}
        src={item.image}
        alt={item.imageAlt}
        priority={priority}
        sizes="100vw"
        className="absolute inset-0 size-full object-cover"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"
        aria-hidden
      />

      {/* شارة عاجل/تغطية خاصة */}
      {item.badge && (
        <span
          className="pointer-events-none absolute start-2 top-2 z-20 inline-flex items-center gap-1.5 px-2 py-1 text-caption font-bold text-white"
          style={{ background: '#ff1e1e', borderRadius: 0 }}
        >
          {item.badge.kind === 'live' && <LivePulse />}
          {item.badge.label}
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.category &&
            (item.categoryHref ? (
              <Link
                href={item.categoryHref}
                className="pointer-events-auto relative bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {item.category}
              </Link>
            ) : (
              <span className="bg-primary px-2 py-0.5 text-caption font-bold text-primary-foreground">
                {item.category}
              </span>
            ))}
          {item.publishedAt && (
            <time dateTime={item.publishedAt} className="text-caption font-medium text-white/85">
              {formatRelativeTime(item.publishedAt)}
            </time>
          )}
        </div>
        <h3 className="line-clamp-3 font-heading text-base font-extrabold leading-tight text-white sm:text-lg">
          {item.title}
        </h3>
      </div>
    </div>
  );
}

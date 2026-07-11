'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

import { EnFeedBadge } from './en-feed-badge';

// Fork of components/home/hero-mobile-carousel.tsx — identical scroll-snap/IntersectionObserver
// swipe-carousel logic, English aria-labels. Shows below 1024px only (lg:hidden equivalent).
export function EnHeroMobileCarousel({ items }: { items: FeedItem[] }) {
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
    <div className="en-hero-carousel">
      <div ref={scrollerRef} className="en-hero-carousel__track">
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={(el) => {
              slidesRef.current[i] = el;
            }}
            data-idx={i}
            className="en-hero-carousel__slide-wrap"
          >
            <EnHeroSlide item={item} priority={i === 0} />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="en-hero-carousel__dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to story ${i + 1}`}
              aria-current={i === active}
              className={i === active ? 'en-hero-carousel__dot en-hero-carousel__dot--active' : 'en-hero-carousel__dot'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EnHeroSlide({ item, priority }: { item: FeedItem; priority: boolean }) {
  const href = enUrl(item.href);
  return (
    <div className="en-hero-slide">
      <Link href={href} className="en-hero-slide__link" aria-label={item.title} />

      <OptimizedImage
        cover={item.cover}
        src={item.image}
        alt={item.imageAlt}
        priority={priority}
        sizes="100vw"
        className="en-hero-slide__img"
      />

      <div className="en-hero-slide__scrim" aria-hidden />

      <EnFeedBadge badge={item.badge} />

      <div className="en-hero-slide__content">
        <div className="en-hero-slide__meta">
          {item.category &&
            (item.categoryHref ? (
              <Link href={enUrl(item.categoryHref)} className="en-hero-chip">{item.category}</Link>
            ) : (
              <span className="en-hero-chip">{item.category}</span>
            ))}
          {item.publishedAt && <time dateTime={item.publishedAt} className="en-hero-slide__time">{enRelative(item.publishedAt)}</time>}
        </div>
        <h3 className="en-hero-slide__title">{item.title}</h3>
      </div>
    </div>
  );
}

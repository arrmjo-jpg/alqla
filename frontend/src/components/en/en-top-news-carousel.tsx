'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { LivePulse } from '@/components/ui/live-pulse';
import { enBadgeLabel, enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of components/home/top-news-carousel.tsx's scroll/arrow-nav logic — redesigned per
// explicit request (not AR parity here): no section heading, side arrows with no background fill,
// circular images instead of rectangular cards, author name shown under the title when the item
// is an opinion piece. Same data source as AR (is_squares-flagged items, up to 10).
export function EnTopNewsCarousel({ items }: { items: FeedItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = (el.children[0] as HTMLElement)?.offsetWidth || 140;
    el.scrollBy({ left: dir * (cardWidth + 16), behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="en-topnews" aria-label="Top news">
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canScrollLeft}
        className="en-topnews__arrow en-topnews__arrow--start"
        aria-label="Previous"
      >
        <ChevronLeft size={26} />
      </button>

      <div ref={scrollRef} onScroll={checkScroll} className="en-topnews__track">
        {items.map((item) => (
          <EnTopNewsCard key={item.id} item={item} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canScrollRight}
        className="en-topnews__arrow en-topnews__arrow--end"
        aria-label="Next"
      >
        <ChevronRight size={26} />
      </button>
    </section>
  );
}

function EnTopNewsCard({ item }: { item: FeedItem }) {
  const isOpinion = item.type === 'opinion';
  return (
    <a href={enUrl(item.href)} className="en-topnews__card">
      <div className="en-topnews__photo">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- performance list image
          <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
        ) : (
          <div className="en-topnews__photo-empty" aria-hidden />
        )}
      </div>

      {item.badge && (
        <span className="en-topnews__badge">
          {item.badge.kind === 'live' && <LivePulse />}
          {enBadgeLabel(item.badge.kind)}
        </span>
      )}

      <h3 className="en-topnews__title">{item.title}</h3>

      {isOpinion && item.author?.name && <span className="en-topnews__author">{item.author.name}</span>}

      {item.publishedAt && <time dateTime={item.publishedAt} className="en-topnews__time">{enRelative(item.publishedAt)}</time>}
    </a>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

import { EnFeedBadge } from './en-feed-badge';

// Gold colour shared across all interactive elements in this carousel.
const GOLD = '#C9A227';

// Fork of components/home/hero-desktop-carousel.tsx — same design: full-width main image +
// gold thumbnail strip below. LTR, so no RTL scroll-negation needed.
export function EnHeroDesktopCarousel({ items }: { items: FeedItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (i: number) => {
      const n = items.length;
      setActive(((i % n) + n) % n);
    },
    [items.length],
  );

  useEffect(() => {
    if (paused || items.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % items.length), 5000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [paused, items.length]);

  if (items.length === 0) return null;

  const current = items[active];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Main image — no large border-radius, matches reference design */}
      <div className="group relative aspect-video w-full overflow-hidden bg-[var(--en-surface-2)]">
        <Link href={enUrl(current.href)} className="absolute inset-0 z-10" aria-label={current.title} />

        <OptimizedImage
          cover={current.cover}
          src={current.image}
          alt={current.imageAlt}
          priority
          sizes="(max-width: 1024px) 100vw, 75vw"
          className="absolute inset-0 size-full object-fill transition-transform duration-700 group-hover:scale-[1.02]"
        />

        {/* Strong dark gradient at bottom to make title pop */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 40%, transparent 75%)',
          }}
          aria-hidden
        />

        <EnFeedBadge badge={current.badge} />

        {/* Title and category at the bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {current.category && (
              <span
                className="pointer-events-auto text-[0.72rem] font-bold text-black px-2 py-0.5"
                style={{ background: GOLD }}
              >
                {current.category}
              </span>
            )}
            {current.publishedAt && (
              <time dateTime={current.publishedAt} className="text-[0.72rem] font-medium text-white/80">
                {enRelative(current.publishedAt)}
              </time>
            )}
          </div>
          <h2
            className="line-clamp-2 font-bold leading-tight text-white"
            style={{ fontFamily: 'var(--en-font-display)', fontSize: 'clamp(1.1rem, 2vw, 1.6rem)' }}
          >
            {current.title}
          </h2>
        </div>

        {/* Navigation arrows — circular semi-transparent with gold border */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              className="absolute start-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all duration-200"
              style={{ background: 'rgba(0,0,0,0.45)', border: `2px solid ${GOLD}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)'; }}
              aria-label="Previous"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              className="absolute end-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all duration-200"
              style={{ background: 'rgba(0,0,0,0.45)', border: `2px solid ${GOLD}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)'; }}
              aria-label="Next"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — gold background for active, dark for inactive */}
      {items.length > 1 && (
        <div className="mt-0 grid grid-cols-5 gap-[2px]">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className="group relative flex flex-col overflow-hidden text-start transition-all duration-200"
              style={{
                outline: i === active ? `3px solid ${GOLD}` : '3px solid transparent',
                outlineOffset: '-3px',
              }}
              aria-current={i === active}
            >
              {/* Thumbnail image */}
              <div className="relative aspect-video w-full overflow-hidden">
                <OptimizedImage
                  cover={item.cover}
                  src={item.image}
                  alt={item.imageAlt}
                  sizes="20vw"
                  className="absolute inset-0 size-full object-fill transition-all duration-300"
                />
              </div>
              {/* Title on gold/dark background */}
              <div
                className="w-full px-2 py-2 flex items-start"
                style={{
                  minHeight: 52,
                  background: i === active ? GOLD : '#1a1a1a',
                  transition: 'background 0.2s',
                }}
              >
                <span
                  className="line-clamp-2 text-[11px] font-bold leading-snug"
                  style={{ color: i === active ? '#111' : '#e5e5e5' }}
                >
                  {item.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

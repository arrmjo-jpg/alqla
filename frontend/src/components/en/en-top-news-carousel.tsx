'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of components/home/top-news-carousel.tsx's redesign (circular cards, white bg, paginated
// arrows+dots, all is_squares items) — this used to be a deliberate departure from AR (no title,
// continuous scroll); that's superseded now that AR itself moved to this shared design. LTR here,
// so — unlike AR's RTL version — scrollLeft uses the standard positive-going range, no negation.
function cardsPerPage(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}

export function EnTopNewsCarousel({ items }: { items: FeedItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(4);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const update = () => setPerPage(cardsPerPage(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollIdleTimer.current) window.clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(items.length / perPage));

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = ((i % pageCount) + pageCount) % pageCount;
      track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
      setPage(clamped);
    },
    [pageCount],
  );

  useEffect(() => {
    if (paused || pageCount <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => goTo(page + 1), 4000);
    return () => window.clearInterval(timer);
  }, [page, paused, pageCount, goTo]);

  // Debounced: onScroll fires repeatedly with intermediate values during the smooth-scroll
  // animation itself, which can round to the wrong page right as it settles.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    if (scrollIdleTimer.current) window.clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => {
      if (!track.clientWidth) return;
      setPage(Math.round(track.scrollLeft / track.clientWidth));
    }, 120);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="en-topnews-section" aria-label="Top news carousel">
      <div className="en-container">
        <div className="en-topnews-header">
          <span className="en-topnews-header__bar" aria-hidden />
          <h2 className="en-topnews-header__title">Top News</h2>
        </div>

        <div className="en-topnews-viewport" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
          {pageCount > 1 && (
            <>
              <button type="button" onClick={() => goTo(page - 1)} className="en-topnews-arrow en-topnews-arrow--start" aria-label="Previous">
                <ChevronLeft size={20} />
              </button>
              <button type="button" onClick={() => goTo(page + 1)} className="en-topnews-arrow en-topnews-arrow--end" aria-label="Next">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="en-topnews-clip">
            <div ref={trackRef} onScroll={onScroll} className="en-topnews-track">
              {items.map((item) => (
                <div key={item.id} className="en-topnews-slide">
                  <EnTopNewsCard item={item} />
                </div>
              ))}
            </div>
          </div>

          {pageCount > 1 && (
            <div className="en-topnews-dots">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Page ${i + 1}`}
                  aria-current={page === i ? 'true' : undefined}
                  className={`en-topnews-dot${page === i ? ' en-topnews-dot--active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EnTopNewsCard({ item }: { item: FeedItem }) {
  const isOpinion = item.type === 'opinion';
  return (
    <article className="en-topnews-card">
      <a href={enUrl(item.href)} className="en-topnews-card__link">
        <div className="en-topnews-card__photo">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- performance list image
            <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
          ) : (
            <div className="en-topnews-card__photo-empty" aria-hidden />
          )}
        </div>
        <h3 className="en-topnews-card__title">{item.title}</h3>
      </a>
      {isOpinion && item.author?.name && (
        <div className="en-topnews-card__author">
          {item.author.avatar && (
            // eslint-disable-next-line @next/next/no-img-element -- performance list image
            <img src={item.author.avatar} alt={item.author.name} loading="lazy" />
          )}
          <span>{item.author.name}</span>
        </div>
      )}
    </article>
  );
}

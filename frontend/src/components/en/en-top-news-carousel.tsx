'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

// Fork of components/home/top-news-carousel.tsx (circular cards, white bg, paginated
// arrows+dots, is_squares items). AR's caller slices to the first 5 items (see
// app/(site)/layout.tsx), which is what keeps desktop static (cardsPerPage(desktop)=5 ⇒
// pageCount=1 ⇒ arrows/dots auto-hide) — mobile still shows a 2-per-page swipeable strip.
// EN's caller (app/en/page.tsx) now slices the same way, so this stays a straight fork of
// AR's own behavior rather than a bespoke EN-only design. LTR here, so scrollLeft uses the
// standard positive-going range (AR's version needs to negate it — Chromium's RTL scrollLeft
// convention is 0..-(scrollWidth-clientWidth)).
function cardsPerPage(width: number): number {
  if (width >= 1024) return 5;
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

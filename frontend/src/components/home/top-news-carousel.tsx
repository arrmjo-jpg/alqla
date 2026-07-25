'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { FeedBadge } from '@/components/home/featured-hero';
import type { FeedItem } from '@/lib/feed';

// Card count per page — two tiers only, kept in sync with the Tailwind width classes on each
// card (w-1/2 sm:w-1/5): mobile (<640) shows 2/page (carousel), sm+ shows all 5 in one static row
// (pageCount resolves to 1 there ⇒ arrows/dots/autoplay auto-hide, no tablet-only carousel tier).
// Native horizontal scroll (scroll-snap) handles touch/trackpad swipe for free.
function cardsPerPage(width: number): number {
  return width >= 640 ? 5 : 2;
}

export function TopNewsCarousel({ items }: { items: FeedItem[] }) {
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
      // dir="rtl" ⇒ Chromium's scrollLeft convention is 0..-(scrollWidth-clientWidth), not
      // 0..+(scrollWidth-clientWidth) — a positive target gets clamped straight back to 0.
      track.scrollTo({ left: -clamped * track.clientWidth, behavior: 'smooth' });
      setPage(clamped);
    },
    [pageCount],
  );

  // يتقدّم تلقائيًّا كلّ 4ث، يتوقّف عند المرور بالماوس أو اللمس، ويحترم prefers-reduced-motion.
  useEffect(() => {
    if (paused || pageCount <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => goTo(page + 1), 4000);
    return () => window.clearInterval(timer);
  }, [page, paused, pageCount, goTo]);

  // المسار وحده هو ما يُقاس (لا يمسّ تمرير الصفحة) — يُزامن `page` عند السحب اليدويّ/اللمس.
  // scrollLeft سالب دائمًا هنا (RTL)، فنأخذ القيمة المطلقة لحساب رقم الصفحة الصحيح. مؤجَّل
  // (debounce) عمدًا: onScroll يتكرّر عشرات المرّات أثناء انزلاق behavior:'smooth' نفسه (قيم
  // وسيطة غير مستقرّة)؛ حساب الصفحة من قيمة في منتصف الحركة قد يُقارب حدًّا كسريًّا (مثل صفحة
  // أخيرة أقصر من صفحة كاملة) ويُقرَّب للاتجاه الخطأ، فيُبطل ما ضبطه goTo قبل قليل.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    if (scrollIdleTimer.current) window.clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => {
      if (!track.clientWidth) return;
      setPage(Math.round(Math.abs(track.scrollLeft) / track.clientWidth));
    }, 120);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-[5px] border-y border-black/5 py-6" dir="rtl" aria-label="سلايدر أبرز الأخبار">
      <Container>
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
        >
          {pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(page - 1)}
                className="absolute -right-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-all hover:text-white"
                style={{ color: 'var(--color-primary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)'; }}
                aria-label="السابق"
              >
                <ChevronRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(page + 1)}
                className="absolute -left-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition-all hover:text-white"
                style={{ color: 'var(--color-primary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary)'; }}
                aria-label="التالي"
              >
                <ChevronLeft className="size-5" />
              </button>
            </>
          )}

          <div className="overflow-hidden">
            <div
              ref={trackRef}
              onScroll={onScroll}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) => (
                <div key={item.id} className="w-1/2 shrink-0 snap-start px-1 sm:w-1/5 sm:px-2">
                  <TopNewsCard item={item} />
                </div>
              ))}
            </div>
          </div>

          {pageCount > 1 && (
            <div className="mt-5 flex justify-center gap-2">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`الصفحة ${i + 1}`}
                  aria-current={page === i ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 ${page === i ? 'w-5' : 'w-2 bg-black/10'}`}
                  style={page === i ? { backgroundColor: 'var(--color-primary)', width: '20px' } : {}}
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function TopNewsCard({ item }: { item: FeedItem }) {
  const isOpinion = item.type === 'opinion';
  return (
    <article className="group relative flex h-full min-w-0 flex-col rounded-xl border border-black/5 bg-white shadow-sm transition hover:shadow-md">
      <Link href={item.href} className="block flex-1">
        <div className="flex flex-col items-center px-2 py-4 sm:px-4 sm:pt-5">
          {/* avatar: escapes the site-wide "square design" reset ([class*='rounded']:not(.avatar)
              in globals.css, !important) that otherwise flattens rounded-full back to square. */}
          <div className="avatar relative size-20 shrink-0 overflow-hidden rounded-full border-2 bg-surface-2 shadow-sm sm:size-[120px]" style={{ borderColor: 'var(--color-primary)' }}>
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
              <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-surface-3" aria-hidden />
            )}
          </div>
          {item.badge && (
            <div className="mt-2">
              <FeedBadge badge={item.badge} />
            </div>
          )}
          <h3 className="mt-3 line-clamp-2 min-h-11 w-full text-center text-[16px] font-normal leading-snug text-fg transition group-hover:text-primary sm:line-clamp-3">
            {item.title}
          </h3>
        </div>
      </Link>
      {isOpinion && item.author?.name && (() => {
        const writerHref = item.author.isWriter && item.author.id ? `/writer/${item.author.id}` : null;
        return (
          <div className="mt-auto flex items-center justify-center gap-1.5 border-t border-black/5 px-2 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
            {item.author.avatar && (
              // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
              <img src={item.author.avatar} alt={item.author.name} loading="lazy" className="avatar size-5 shrink-0 rounded-full object-cover sm:size-6" />
            )}
            {writerHref ? (
              <Link
                href={writerHref}
                className="relative z-20 min-w-0 truncate text-[11px] font-bold text-primary hover:underline"
              >
                {item.author.name}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-[11px] font-bold text-primary">{item.author.name}</span>
            )}
          </div>
        );
      })()}
    </article>
  );
}

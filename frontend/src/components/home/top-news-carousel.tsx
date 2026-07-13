'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { FeedBadge } from '@/components/home/featured-hero';
import type { FeedItem } from '@/lib/feed';

// Card count per page at each breakpoint — kept in sync with the Tailwind width classes on each
// card (w-1/2 sm:w-1/3 lg:w-1/4) so the JS-computed dot count/scroll-page-size matches what's
// actually visible. Native horizontal scroll (scroll-snap) handles touch/trackpad swipe for free.
function cardsPerPage(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
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
                className="absolute -right-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-lg ring-1 ring-black/5 transition-all hover:bg-primary hover:text-white"
                aria-label="السابق"
              >
                <ChevronRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(page + 1)}
                className="absolute -left-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-lg ring-1 ring-black/5 transition-all hover:bg-primary hover:text-white"
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
                <div key={item.id} className="w-1/2 shrink-0 snap-start px-1 sm:w-1/3 sm:px-2 lg:w-1/4">
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
                  className={`h-2 rounded-full transition-all duration-300 ${page === i ? 'w-5 bg-primary' : 'w-2 bg-black/10'}`}
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
    <article className="group flex h-full min-w-0 flex-col rounded-xl border border-black/5 bg-white shadow-sm transition hover:shadow-md">
      <Link href={item.href} className="block flex-1">
        <div className="flex flex-col items-center px-2 py-4 sm:px-4 sm:pt-5">
          {/* avatar: escapes the site-wide "square design" reset ([class*='rounded']:not(.avatar)
              in globals.css, !important) that otherwise flattens rounded-full back to square. */}
          <div className="avatar relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-surface-2 shadow-sm sm:size-[120px]">
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
      {isOpinion && item.author?.name && (
        <div className="mt-auto flex items-center justify-center gap-1.5 border-t border-black/5 px-2 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
          {item.author.avatar && (
            // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
            <img src={item.author.avatar} alt={item.author.name} loading="lazy" className="avatar size-5 shrink-0 rounded-full object-cover sm:size-6" />
          )}
          <span className="min-w-0 truncate text-[11px] font-bold text-muted">{item.author.name}</span>
        </div>
      )}
    </article>
  );
}

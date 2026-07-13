'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

import { CategoryChip, FeedBadge } from './featured-hero';

// كاروسيل الهيرو على سطح المكتب — صورة رئيسية كبيرة + شريط صور مصغّرة متزامن أسفلها (بدل الكرت
// الرئيسي + شبكة 2×2 السابقة). عنصر واحد نشط في كلّ مرّة (بدل مسارَين متزامنَين منفصلين كما في
// الكود المرجعي المُرفَق) — أبسط، ونتيجته البصريّة/التفاعليّة نفسها لعدد عناصر الهيرو المعتاد (~5).
export function HeroDesktopCarousel({ items }: { items: FeedItem[] }) {
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
      {/* الصورة الرئيسية */}
      <div className="group relative aspect-video w-full overflow-hidden bg-surface-2" style={{ borderRadius: '15px' }}>
        <Link href={current.href} className="absolute inset-0 z-10" aria-label={current.title} />

        <OptimizedImage
          cover={current.cover}
          src={current.image}
          alt={current.imageAlt}
          priority
          sizes="(max-width: 1024px) 100vw, 75vw"
          className="absolute inset-0 size-full object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden />

        <FeedBadge badge={current.badge} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip name={current.category} href={current.categoryHref} />
            {current.publishedAt && (
              <time dateTime={current.publishedAt} className="text-caption font-medium text-white/85">
                {formatRelativeTime(current.publishedAt)}
              </time>
            )}
          </div>
          <h2 className="line-clamp-2 font-heading text-xl font-extrabold leading-tight text-white sm:text-2xl">
            {current.title}
          </h2>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              className="absolute end-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-black/40 text-white transition-colors hover:bg-primary"
              aria-label="السابق"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              className="absolute start-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center bg-black/40 text-white transition-colors hover:bg-primary"
              aria-label="التالي"
            >
              <ChevronLeft className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* شريط الصور المصغّرة — متزامن مع الصورة الرئيسية */}
      {items.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className={`group relative aspect-video overflow-hidden text-start transition-all ${
                i === active ? 'opacity-100 ring-2 ring-primary' : 'opacity-60 hover:opacity-90'
              }`}
              style={{ borderRadius: '8px' }}
              aria-current={i === active}
            >
              <OptimizedImage
                cover={item.cover}
                src={item.image}
                alt={item.imageAlt}
                sizes="20vw"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 p-2 text-[11px] font-bold leading-snug text-white">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

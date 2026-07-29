'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

import { FeedBadge } from './featured-hero';

// لون ذهبي موحّد لكامل الكاروسيل
const GOLD = '#C9A227';

// كاروسيل الهيرو على سطح المكتب — صورة رئيسية كبيرة + شريط صور مصغّرة ذهبيّة متزامن أسفلها.
// التصميم: صورة بلا حواف مدوّرة كبيرة، أسهم دائرية شفّافة، شريط ذهبيّ تحت كلّ مصغّرة.
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
    <div className="flex h-full flex-col" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* الصورة الرئيسية — aspect-video يبقى الحجم الطبيعيّ/الأدنى (بلا تفاوت حجم الهيرو بين اللغات
          حسب عدد عناصر «آخر المستجدات» — كان هذا خطأ النسخة السابقة: flex-1 وحده بلا aspect-video
          يُلغي مساهمة الهيرو بحساب ارتفاع الصفّ، فيرث ارتفاعه بالكامل من القائمة المجاورة، وإن كانت
          قصيرة (كما في الإنجليزي، عناصر أقلّ) ينكمش الهيرو معها). flex-1 إضافيًّا فقط لينمو فوق
          الحدّ الطبيعيّ إن كانت القائمة أطول (حالة العربي الأصليّة). */}
      <div className="group relative aspect-video min-h-0 w-full flex-1 overflow-hidden bg-surface-2">
        <Link href={current.href} className="absolute inset-0 z-10" aria-label={current.title} />

        <OptimizedImage
          cover={current.cover}
          src={current.image}
          alt={current.imageAlt}
          priority
          sizes="(max-width: 1024px) 100vw, 75vw"
          className="absolute inset-0 size-full object-fill transition-transform duration-700 group-hover:scale-[1.02]"
        />

        {/* تدرّج داكن قوي في الأسفل لإبراز العنوان */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 40%, transparent 75%)',
          }}
          aria-hidden
        />

        <FeedBadge badge={current.badge} />

        {/* العنوان والتصنيف في الأسفل */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {current.category && (
              <span
                className="pointer-events-auto text-caption font-bold text-white px-2 py-0.5"
                style={{ background: GOLD }}
              >
                {current.category}
              </span>
            )}
            {current.publishedAt && (
              <time dateTime={current.publishedAt} className="text-caption font-medium text-white/80">
                {formatRelativeTime(current.publishedAt)}
              </time>
            )}
          </div>
          <h2 className="line-clamp-2 font-heading text-xl font-extrabold leading-tight text-white sm:text-2xl lg:text-3xl">
            {current.title}
          </h2>
        </div>

        {/* أسهم التنقّل — دائرية شفّافة على غرار التصميم المرجعيّ */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              className="absolute end-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all duration-200"
              style={{ background: 'rgba(0,0,0,0.45)', border: `2px solid ${GOLD}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)'; }}
              aria-label="السابق"
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              className="absolute start-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all duration-200"
              style={{ background: 'rgba(0,0,0,0.45)', border: `2px solid ${GOLD}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = GOLD; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)'; }}
              aria-label="التالي"
            >
              <ChevronLeft className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* شريط الصور المصغّرة — خلفية ذهبيّة + عنوان تحت الصورة، بلا حواف مدوّرة. shrink-0 (لا يضيق
          داخل flex-col الأب) + مصغّرات أكبر شوي (4:3 بدل 16:9) ⇒ يقرّب ارتفاع الهيرو الكامل من
          ارتفاع «آخر المستجدات» المجاورة. */}
      {items.length > 1 && (
        <div className="mt-0 grid shrink-0 grid-cols-5 gap-[2px]">
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
              {/* صورة المصغّرة */}
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <OptimizedImage
                  cover={item.cover}
                  src={item.image}
                  alt={item.imageAlt}
                  sizes="20vw"
                  className="absolute inset-0 size-full object-fill transition-all duration-300"
                />
              </div>
              {/* العنوان على خلفية ذهبيّة */}
              <div
                className="w-full px-2 py-2 min-h-[58px] flex items-start"
                style={{
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

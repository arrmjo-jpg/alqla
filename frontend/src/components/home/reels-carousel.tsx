'use client';

import { useRef, useState } from 'react';

import { ReelCard } from '@/components/reels/reel-card';
import type { ReelItem } from '@/lib/reels';

import { ReelsModal } from './reels-modal';
import { SectionHeader, SectionMore } from './section-header';

// كروسل الريلز في الرئيسية (أسفل آخر المستجدات): بطاقات 9:16 تشتغل عند المرور بالموس،
// والنقر يفتح موديل داخل الصفحة (تنقّل بالسكرول/الأسهم/المفاتيح/اللمس). تمرير أفقيّ RTL.
export function ReelsCarousel({
  items,
  siteName,
  logo,
}: {
  items: ReelItem[];
  siteName: string;
  logo: string | null;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (items.length === 0) return null;

  const scroll = (dir: 1 | -1) => stripRef.current?.scrollBy({ left: dir * 360, behavior: 'smooth' });

  return (
    <section className="mt-6 sm:mt-8" aria-labelledby="reels-carousel-heading">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض (كباقي الأقسام). */}
        <SectionHeader title="الريلز" headingId="reels-carousel-heading" href="/reels" />

        <div className="group/strip relative">
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="السابق"
            className="absolute -end-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center bg-surface text-fg opacity-0 shadow-md transition group-hover/strip:opacity-100 sm:flex"
            style={{ borderRadius: '9999px' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="التالي"
            className="absolute -start-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center bg-surface text-fg opacity-0 shadow-md transition group-hover/strip:opacity-100 sm:flex"
            style={{ borderRadius: '9999px' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={stripRef}
            className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((reel, i) => (
              <ReelCard key={reel.id} reel={reel} logo={logo} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
        </div>

        {/* «عرض الكل» أسفل القسم (كباقي الأقسام). */}
        <SectionMore href="/reels" />
      </div>

      {openIndex !== null && (
        <ReelsModal
          items={items}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          siteName={siteName}
          logo={logo}
        />
      )}
    </section>
  );
}

// (ReelCard + formatDuration انتقلا إلى components/reels/reel-card.tsx — مصدر واحد مُعاد الاستخدام.)

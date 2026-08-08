'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { ReelsModal } from '@/components/home/reels-modal';
import { ReelCard } from '@/components/reels/reel-card';
import type { ReelItem } from '@/lib/reels';

// عارض ريلز مفرد للعمود الجانبيّ — ريل واحد بعرض العمود كاملاً + سهمان (السابق/التالي) للتنقّل
// بينها، بعكس الشريط الأفقيّ (بعرض جزئيّ + سكرول) المستخدَم بكاروسيل الرئيسية. نفس البطاقة
// والموديل بالضبط عند فتح الريل (reels-carousel.tsx). رأس القسم منفصل بـsidebar-reels.tsx.
export function SidebarReelsStrip({
  items,
  siteName,
  logo,
}: {
  items: ReelItem[];
  siteName: string;
  logo: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const canPrev = current > 0;
  const canNext = current < items.length - 1;
  const reel = items[current];

  return (
    <>
      <div className="relative p-3">
        <ReelCard key={reel.id} reel={reel} logo={logo} onOpen={() => setOpenIndex(current)} className="w-full" />

        {canPrev && (
          <button
            type="button"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            aria-label="السابق"
            className="absolute top-1/2 start-5 z-10 flex size-8 -translate-y-1/2 items-center justify-center bg-black/50 text-white shadow-md transition hover:bg-black/70"
            style={{ borderRadius: '9999px' }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        )}
        {canNext && (
          <button
            type="button"
            onClick={() => setCurrent((i) => Math.min(items.length - 1, i + 1))}
            aria-label="التالي"
            className="absolute top-1/2 end-5 z-10 flex size-8 -translate-y-1/2 items-center justify-center bg-black/50 text-white shadow-md transition hover:bg-black/70"
            style={{ borderRadius: '9999px' }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        )}

        {items.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {items.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`الريل ${i + 1}`}
                className={`size-1.5 shrink-0 transition-colors ${i === current ? 'bg-primary' : 'bg-border'}`}
                style={{ borderRadius: '9999px' }}
              />
            ))}
          </div>
        )}
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
    </>
  );
}

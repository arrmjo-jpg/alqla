'use client';

import { ChevronLeft, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { AseTickerItem } from '@/lib/ase-market';

// بطاقة بورصة عمّان — تصميم أصيل «طرفيّة تداول داكنة»: خلفيّة شبكة خافتة + توهّج اتّجاهيّ (أخضر صعود/أحمر هبوط) +
// قيمة دوّارة (flip كلّ ~3.2ث) برقم بارز وحبّة تغيّر متوهّجة. المصدر الرسميّ ticker_feeds. يحترم reduced-motion.
export function BourseRotator({
  items,
  marketOpen,
  marketLabel,
  className = '',
}: {
  items: AseTickerItem[];
  marketOpen: boolean;
  marketLabel: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % items.length), 3200);
    return () => clearInterval(t);
  }, [items.length]);

  const cur = items.length > 0 ? items[idx % items.length] : null;
  const up = cur?.dir === 'up';
  const down = cur?.dir === 'down';
  const tone = up ? '#34d399' : down ? '#fb7185' : '#94a3b8';
  const toneBg = up ? 'rgba(52,211,153,.15)' : down ? 'rgba(251,113,133,.15)' : 'rgba(148,163,184,.14)';
  const glow = up ? 'rgba(52,211,153,.22)' : down ? 'rgba(251,113,133,.22)' : 'rgba(148,163,184,.10)';
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <Link
      href="/bourse"
      className={`relative flex flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md ${className}`}
      style={{ borderRadius: '16px', background: 'linear-gradient(160deg, #0d1626 0%, #0a111e 58%, #070b14 100%)' }}
      aria-label="بورصة عمّان — لوحة السوق الكاملة"
    >
      {/* شبكة طرفيّة خافتة */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(125,177,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,177,255,.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          opacity: 0.07,
        }}
        aria-hidden
      />
      {/* توهّج اتّجاهيّ علويّ */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-24 transition-colors duration-500"
        style={{ background: `radial-gradient(62% 100% at 50% 0%, ${glow}, transparent 72%)` }}
        aria-hidden
      />

      {/* الرأس */}
      <div className="relative flex items-center justify-between gap-2 px-3.5 pt-3">
        <span className="flex items-center gap-1.5 text-sm font-extrabold text-white">
          بورصة عمّان
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-rose-300"
            style={{ borderRadius: '4px', background: 'rgba(244,63,94,.16)' }}
          >
            <span className="size-1.5 animate-pulse rounded-full bg-rose-400" aria-hidden />
            LIVE
          </span>
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold">
          <span
            className={`size-1.5 shrink-0 rounded-full ${marketOpen ? 'animate-pulse bg-emerald-400' : 'bg-white/40'}`}
            aria-hidden
          />
          <span className={marketOpen ? 'text-emerald-300' : 'text-white/55'}>{marketLabel}</span>
        </span>
      </div>

      {/* الجسم الدوّار */}
      <div className="relative flex flex-1 items-center px-4 py-5" style={{ perspective: '700px' }}>
        {cur ? (
          <div key={idx} className="qn-bourse-flip w-full">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/55">
              {cur.isIndex && (
                <span className="px-1.5 py-0.5 text-[9px] text-white/70" style={{ borderRadius: '4px', background: 'rgba(255,255,255,.08)' }}>
                  مؤشّر
                </span>
              )}
              <span className="truncate">{cur.isIndex ? cur.symbol : cur.name}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="font-heading text-3xl font-black tabular-nums text-white">{cur.price}</span>
              <span
                className="flex items-center gap-1 px-2 py-0.5 text-sm font-extrabold tabular-nums"
                style={{ color: tone, background: toneBg, borderRadius: '9999px' }}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {cur.changePct > 0 ? '+' : ''}
                {cur.changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-white/55">بيانات السوق غير متاحة حالياً</p>
        )}
      </div>

      {/* التذييل */}
      <div className="relative border-t border-white/10 px-3.5 py-2">
        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#7db1ff' }}>
          لوحة السوق الكاملة
          <ChevronLeft className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

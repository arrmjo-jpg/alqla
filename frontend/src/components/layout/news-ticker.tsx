'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft } from 'lucide-react';

export interface TickerItem {
  id: number;
  title: string;
  href: string;
}

export function NewsTicker({ items }: { items: TickerItem[] }) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<'type' | 'pause' | 'delete'>('type');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleNext = useCallback(() => {
    setIdx((prev) => (prev + 1) % items.length);
    setLen(0);
    setPhase('type');
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setIdx((prev) => (prev - 1 + items.length) % items.length);
    setLen(0);
    setPhase('type');
  }, [items.length]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Effect for the typewriter animation
  useEffect(() => {
    if (items.length === 0) return;
    if (!isPlaying || isHovered) return;

    let t: ReturnType<typeof setTimeout>;
    const cur = items[idx % items.length];
    const full = cur.title;

    if (phase === 'type') {
      t = setTimeout(() => {
        if (len < full.length) {
          setLen(len + 1);
        } else {
          setPhase('pause');
        }
      }, len < full.length ? 45 : 60);
    } else if (phase === 'pause') {
      t = setTimeout(() => {
        setPhase('delete');
      }, 2200);
    } else if (phase === 'delete') {
      if (len > 0) {
        t = setTimeout(() => {
          setLen(len - 1);
        }, 22);
      } else {
        setIdx((prev) => (prev + 1) % items.length);
        setPhase('type');
      }
    }

    return () => clearTimeout(t);
  }, [phase, len, idx, isPlaying, isHovered, items]);

  if (items.length === 0) return null;

  const currentItem = items[((idx % items.length) + items.length) % items.length];

  return (
    <div
      className="flex min-h-[50px] items-stretch justify-between border-y border-border bg-white px-0 select-none print:hidden"
      dir="rtl"
    >
      <div
        className="flex min-w-0 flex-1 items-stretch gap-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* شارة آخر الأخبار — خلفية سوداء + نص ذهبي + فلاش متكرر */}
        <span
          className="relative overflow-hidden flex shrink-0 items-center justify-center gap-2 px-4 sm:px-6 text-[13px] font-extrabold self-stretch select-none"
          style={{ background: '#000', color: '#C9A227' }}
        >
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(120deg, transparent 0%, rgba(201,162,39,0.5) 50%, transparent 100%)',
              animation: 'ticker-badge-shimmer 3s ease-in-out infinite',
            }}
            aria-hidden
          />
          {/* نقطة دائرية نابضة — مثل الإنجليزي */}
          <span
            className="relative z-10 shrink-0"
            style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#C9A227',
              animation: 'ar-ticker-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
              display: 'inline-block',
            }}
            aria-hidden
          />
          <span className="relative z-10">آخر الأخبار</span>
        </span>

        {/* النص الإخباري (آلة كاتبة) — ديسكتوب فقط، الجوّال يستعمل التكير المتحرّك بالأسفل */}
        <div className="min-w-0 flex-1 hidden md:flex items-center">
          <Link
            href={currentItem.href}
            className="block truncate text-[14.5px] font-bold text-fg transition-all duration-300 hover:text-primary"
          >
            {currentItem.title.slice(0, len)}
            <span className="news-cursor ms-0.5 inline-block font-normal text-primary">▌</span>
          </Link>
        </div>

        {/* تكير متحرّك مستمرّ لكلّ العناوين معًا — جوّال فقط (يحلّ مشكلة اختفاء النصّ خلف الشارة/الأزرار) */}
        <div className="news-ticker-marquee min-w-0 flex-1 flex md:hidden items-center overflow-hidden">
          <div className="news-ticker-track">
            {items.map((it) => (
              <span key={`a-${it.id}`} className="news-ticker-marquee__item-wrap">
                <Link href={it.href} className="news-ticker-marquee__item">{it.title}</Link>
                <span className="news-ticker-marquee__sep" aria-hidden>•</span>
              </span>
            ))}
            {items.map((it) => (
              <span key={`b-${it.id}`} className="news-ticker-marquee__item-wrap" aria-hidden>
                <Link href={it.href} className="news-ticker-marquee__item" tabIndex={-1}>{it.title}</Link>
                <span className="news-ticker-marquee__sep" aria-hidden>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* أزرار التحكم — ديسكتوب فقط */}
      <div className="ms-4 hidden md:flex shrink-0 items-center gap-1.5 border-r border-border ps-4 pe-4 sm:pe-6 md:pe-8">
        {/* زر السابق */}
        <button
          onClick={handlePrev}
          className="flex size-7 items-center justify-center bg-[#C9A227] text-white transition-colors hover:bg-black cursor-pointer border-0"
          title="السابق"
          aria-label="السابق"
        >
          <ChevronRight className="size-4" />
        </button>

        {/* زر التشغيل / الإيقاف المؤقت */}
        <button
          onClick={togglePlay}
          className="flex size-7 items-center justify-center bg-[#C9A227] text-white transition-colors hover:bg-black cursor-pointer border-0"
          title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>

        {/* زر التالي */}
        <button
          onClick={handleNext}
          className="flex size-7 items-center justify-center bg-[#C9A227] text-white transition-colors hover:bg-black cursor-pointer border-0"
          title="التالي"
          aria-label="التالي"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    </div>
  );
}

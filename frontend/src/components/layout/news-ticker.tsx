'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// شريط إخباريّ تحت المنيو — آخر ١٠ أخبار. ديسكتوب: أثر «الآلة الكاتبة» (يكتب العنوان حرفًا حرفًا ثمّ يمسحه
// وينتقل للتالي). جوّال: تكير متحرّك من الشمال لليمين (CSS، translate3d لثبات الحركة على iOS). يحترم
// prefers-reduced-motion. فارغ ⇒ يُخفى.
export interface TickerItem {
  id: number;
  title: string;
  href: string;
}

export function NewsTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="flex min-h-[56px] items-center gap-2.5 overflow-hidden border-y border-border bg-white px-4 py-2.5 sm:px-8"
      dir="rtl"
    >
      <span
        className="flex shrink-0 items-center gap-1.5 bg-primary px-3 py-1.5 text-[13px] font-extrabold text-white"
        style={{ borderRadius: '6px' }}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
        آخر الأخبار
      </span>

      {/* ديسكتوب: آلة كاتبة */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <Typewriter items={items} />
      </div>

      {/* جوّال: تكير متحرّك — dir="ltr" لازم: داخل حاوية RTL يُحاذى الـinline-flex العريض لليمين فينسكب
          خارج الشاشة يسارًا ويختفي؛ ltr يضعه عند الحافة اليسرى فتعمل الإزاحة. (العناوين تبقى rtl داخل المجموعات.) */}
      <div className="block min-w-0 flex-1 overflow-hidden sm:hidden" dir="ltr">
        <Marquee items={items} />
      </div>
    </div>
  );
}

function Typewriter({ items }: { items: TickerItem[] }) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<'type' | 'pause' | 'delete'>('type');
  const cur = items[idx % items.length];
  const full = cur.title;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'type') {
      t = setTimeout(() => (len < full.length ? setLen(len + 1) : setPhase('pause')), len < full.length ? 45 : 60);
    } else if (phase === 'pause') {
      t = setTimeout(() => setPhase('delete'), 2200);
    } else {
      if (len > 0) {
        t = setTimeout(() => setLen(len - 1), 22);
      } else {
        setIdx((p) => (p + 1) % items.length);
        setPhase('type');
      }
    }
    return () => clearTimeout(t);
  }, [phase, len, full, items.length]);

  return (
    <Link href={cur.href} className="block truncate text-[15px] font-bold text-fg transition-colors hover:text-primary">
      {full.slice(0, len)}
      <span className="news-cursor ms-0.5 inline-block font-normal text-primary">▌</span>
    </Link>
  );
}

function Marquee({ items }: { items: TickerItem[] }) {
  // مجموعتان متطابقتان (شقيقتان مباشرتان، كلٌّ shrink-0) كي يساوي إزاحة 50% عرض مجموعة واحدة بالضبط ⇒ التفاف سلس.
  const group = (key: string, hidden: boolean) => (
    <div key={key} className="flex shrink-0 items-center" dir="rtl" aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <Link key={it.id} href={it.href} className="flex shrink-0 items-center gap-2 px-4 text-[15px] font-bold text-fg">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className="whitespace-nowrap">{it.title}</span>
        </Link>
      ))}
    </div>
  );
  return (
    <div className="news-ticker-track" dir="ltr">
      {group('a', false)}
      {group('b', true)}
    </div>
  );
}

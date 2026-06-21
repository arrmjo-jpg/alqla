import { Coins } from 'lucide-react';
import Link from 'next/link';

import type { GoldPrices, GoldRow } from '@/lib/gold';

import { ChangePill, GOLD } from './gold-table';

// ويدجت أسعار الذهب — تصميم أصيل: **لوح عيار 24 ذهبيّ بلمعة متحرّكة** (سعر بارز محفور) فوق صفوف مدمجة لبقيّة
// العيارات/الليرات بنقطة ذهبيّة. نفس البيانات الحقيقيّة (بيع/شراء/اتّجاه/نسبة). لا بيانات ⇒ حالة فارغة (لا تلفيق).
export function GoldWidget({ gold, className = '' }: { gold: GoldPrices | null; className?: string }) {
  const rows = gold ? [...gold.karats, ...gold.liras] : [];

  if (!gold || rows.length === 0) {
    return (
      <div
        className={`flex min-h-[200px] flex-col items-center justify-center gap-2 bg-white p-6 text-center shadow-sm ring-1 ring-border ${className}`}
        style={{ borderRadius: '16px' }}
      >
        <span className="flex size-12 items-center justify-center" style={{ background: GOLD, borderRadius: '9999px' }} aria-hidden>
          <Coins className="size-6 text-[#3a2c08]" />
        </span>
        <p className="text-sm font-extrabold text-fg">أسعار الذهب</p>
        <p className="text-xs text-muted">الأسعار غير متاحة حاليّاً</p>
        <Link href="/gold-prices" className="mt-1 text-xs font-bold text-primary hover:underline">
          أرشيف الأسعار ←
        </Link>
      </div>
    );
  }

  const [head, ...rest] = rows;
  const headIsKarat = /^\d+$/.test(head.key);

  return (
    <div className={`flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-border ${className}`} style={{ borderRadius: '16px' }}>
      {/* الرأس */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <span className="flex items-center gap-2 text-sm font-extrabold text-fg">
          <span className="flex size-7 items-center justify-center" style={{ background: GOLD, borderRadius: '8px' }} aria-hidden>
            <Coins className="size-4 text-[#3a2c08]" />
          </span>
          أسعار الذهب
        </span>
        <span className="text-[10px] font-bold text-muted">د.أ / غرام</span>
      </div>

      {/* لوح عيار 24 الذهبيّ — لمعة متحرّكة + سعر محفور */}
      <div
        className="relative mx-3.5 mt-3 overflow-hidden p-3.5 text-[#3a2c08]"
        style={{
          background: GOLD,
          borderRadius: '13px',
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,.6), inset 0 -2px 6px rgba(120,80,10,.25), 0 6px 16px rgba(184,134,11,.3)',
        }}
      >
        <span className="qn-shine" aria-hidden />
        <div className="relative flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-extrabold opacity-80">
              {head.label}
              {headIsKarat ? ` · عيار ${head.key}` : ''}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-heading text-3xl font-black tabular-nums leading-none">{head.sell.toFixed(2)}</span>
              <span className="text-[10px] font-bold opacity-75">شراء {head.buy.toFixed(2)}</span>
            </div>
          </div>
          <ChangePill up={head.up} pct={head.pct} />
        </div>
      </div>

      {/* بقيّة العيارات/الليرات */}
      <div className="mt-2 flex flex-1 flex-col px-2 pb-1">
        {rest.map((r) => (
          <CompactRow key={r.key} row={r} />
        ))}
      </div>

      {/* التذييل */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2 text-[11px]">
        {gold.updatedRelative ? <span className="truncate text-muted">{gold.updatedRelative}</span> : <span />}
        <Link href="/gold-prices" className="relative z-20 shrink-0 font-bold text-primary hover:underline">
          التفاصيل ←
        </Link>
      </div>
    </div>
  );
}

function CompactRow({ row }: { row: GoldRow }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1.5 py-1.5 transition-colors hover:bg-amber-50/70" style={{ borderRadius: '8px' }}>
      <span className="flex items-center gap-2 truncate text-xs font-bold text-fg">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: '#d9b44a' }} aria-hidden />
        {row.label}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs font-extrabold tabular-nums text-fg">{row.sell.toFixed(2)}</span>
        <ChangePill up={row.up} pct={row.pct} />
      </div>
    </div>
  );
}

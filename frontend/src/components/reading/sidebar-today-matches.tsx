import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { MatchRow } from '@/components/sport/match-row';
import { getMatchesByCompetition } from '@/lib/sport/games';

const GREEN = 'linear-gradient(100deg, #0b7a3b 0%, #064e2a 100%)';
const MAX_MATCHES = 10;

// تاريخ اليوم ⇒ YYYY-MM-DD (يُحسب وقت التوليد/التحديث ISR).
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// «مباريات اليوم» بالشريط الجانبيّ — مباريات اليوم فقط (بلا تبويبات أمس/غدًا، بعكس ودجت الرياضة
// بالرئيسية) — يتمدّد ارتفاعه حسب عدد المباريات الفعليّ (بلا سقف ثابت). لا مباريات اليوم ⇒ يُخفى.
export async function SidebarTodayMatches() {
  const groups = await getMatchesByCompetition(1, todayYmd());
  const matches = groups.flatMap((g) => g.matches).slice(0, MAX_MATCHES);
  if (matches.length === 0) return null;

  return (
    <div className="overflow-hidden border border-border bg-white" style={{ borderRadius: '14px' }}>
      <div className="flex items-center justify-between gap-2 px-3.5 py-3 text-white" style={{ background: GREEN }}>
        <span className="flex items-center gap-2 font-heading text-sm font-extrabold">
          <CalendarDays className="size-4 shrink-0" style={{ color: '#ffd34d' }} aria-hidden />
          مباريات اليوم
        </span>
        <Link href="/sport" className="text-xs font-bold text-white/85 hover:text-white">
          المزيد
        </Link>
      </div>

      <div>
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

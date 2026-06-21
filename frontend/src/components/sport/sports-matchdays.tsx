'use client';

import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

// ودجت «المباريات» للشريط الجانبيّ (مكان جدول الدوري سابقًا) — تبويب: أمس · اليوم · غداً · بعد غد، وبطاقات
// مباريات اليوم المختار (شعارات + نتيجة/موعد + «مباشر» نابض). بيانات حيّة من 365Scores. الافتراضيّ = اليوم.
export interface MatchdaySide {
  name: string;
  score: number | null;
  logo: string | null;
}
export interface MatchdayMatch {
  id: number;
  kind: 'live' | 'upcoming' | 'finished';
  minute: string | null;
  startTime: string | null;
  comp: string;
  compLogo: string | null;
  home: MatchdaySide;
  away: MatchdaySide;
}
export interface MatchDay {
  label: string;
  date: string; // YYYY-MM-DD
  matches: MatchdayMatch[];
}

const GREEN = '#0b7a3b';

function kickoff(startTime: string | null): string {
  if (!startTime) return '';
  try {
    return new Date(startTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' });
  } catch {
    return '';
  }
}
function dayMonth(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)}/${Number(m)}`;
}

export function SportsMatchdays({ days }: { days: MatchDay[] }) {
  const todayIdx = days.findIndex((d) => d.label === 'اليوم');
  const [active, setActive] = useState(todayIdx >= 0 ? todayIdx : 0);
  const day = days[active] ?? days[0];

  return (
    <div className="flex h-full max-h-[460px] flex-col overflow-hidden border border-border bg-white shadow-sm lg:max-h-none" style={{ borderRadius: '14px' }}>
      {/* الرأس الأخضر */}
      <div className="flex items-center gap-2 px-3.5 py-3 text-white" style={{ background: 'linear-gradient(100deg, #0b7a3b 0%, #064e2a 100%)' }}>
        <CalendarDays className="size-5 shrink-0" style={{ color: '#ffd34d' }} aria-hidden />
        <span className="font-heading text-sm font-extrabold">المباريات</span>
      </div>

      {/* تبويب الأيّام */}
      <div className="grid grid-cols-4 border-b border-border">
        {days.map((d, i) => {
          const on = i === active;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-0.5 py-2 font-extrabold transition-colors ${
                on ? 'text-white' : 'text-fg hover:bg-surface-2'
              }`}
              style={on ? { background: GREEN } : undefined}
            >
              <span className="text-[11px]">{d.label}</span>
              <span className="text-[9px] font-bold opacity-70">{dayMonth(d.date)}</span>
            </button>
          );
        })}
      </div>

      {/* مباريات اليوم المختار */}
      {day.matches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm font-medium text-muted">
          لا مباريات بارزة في هذا اليوم
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {day.matches.map((m) => (
            <MatchCard key={m.id} m={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

// بطاقة مباراة عموديّة مدمجة — صفّ علويّ: البطولة + الحالة/الموعد، ثمّ صفّا الفريقين (شعار + اسم + نتيجة).
function MatchCard({ m }: { m: MatchdayMatch }) {
  const isLive = m.kind === 'live';
  const finished = m.kind === 'finished';
  const showScore = (isLive || finished) && m.home.score != null && m.away.score != null;
  const homeWin = showScore && (m.home.score as number) > (m.away.score as number);
  const awayWin = showScore && (m.away.score as number) > (m.home.score as number);

  return (
    <li className="flex flex-col justify-center gap-1.5 px-3 py-2.5">
      {/* البطولة + الحالة */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-muted">
          {m.compLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- شعار البطولة من 365Scores
            <img src={m.compLogo} alt="" loading="lazy" className="size-3.5 shrink-0 object-contain" />
          )}
          <span className="truncate">{m.comp}</span>
        </span>
        {isLive ? (
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-primary">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {m.minute || 'مباشر'}
          </span>
        ) : finished ? (
          <span className="shrink-0 text-[10px] font-bold text-muted">انتهت</span>
        ) : (
          <span className="shrink-0 text-[11px] font-extrabold" style={{ color: GREEN }}>
            {kickoff(m.startTime)}
          </span>
        )}
      </div>

      <TeamLine side={m.home} score={showScore ? m.home.score : null} win={homeWin} />
      <TeamLine side={m.away} score={showScore ? m.away.score : null} win={awayWin} />
    </li>
  );
}

function TeamLine({ side, score, win }: { side: MatchdaySide; score: number | null; win: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {side.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- شعار الفريق من 365Scores
        <img src={side.logo} alt="" loading="lazy" className="size-5 shrink-0 object-contain" />
      ) : (
        <span className="size-5 shrink-0 rounded-full bg-surface-3" aria-hidden />
      )}
      <span className={`min-w-0 flex-1 truncate text-[13px] text-fg ${win ? 'font-extrabold' : 'font-bold'}`}>{side.name}</span>
      {score != null && (
        <span className={`w-4 shrink-0 text-center text-sm ${win ? 'font-extrabold text-fg' : 'font-bold text-muted'}`}>{score}</span>
      )}
    </div>
  );
}

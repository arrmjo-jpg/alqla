import 'server-only';
import { cache } from 'react';

import { env } from '@/lib/env';

import type { PlayerProvider } from './providers';
import type { CareerSection, PlayerCareerData, PlayerGame, PlayerProfile, PlayerTeam, TrophyGroup } from './player-legacy';

// مزوّد "Aggregate" — نداء داخلي واحد لـLaravel (`GET /api/v1/sports/players/{id}`، PlayerAggregateService)
// بدل حتى ٣٠ نداء منفصل لـ365Scores كان يطلقها player-legacy.ts. راجع STORAGE_DEEPDIVE_5.5GB_SOURCE_2026-08-07.md
// للسبب، وPlayerAggregateService للتفصيل الخادميّ. مفتاح Next.js fetch-cache هنا **واحد لكل لاعب فقط**
// (athleteId هو المتغيّر الوحيد بمسار الطلب) — لا مواسم ولا بطولات منفصلة، بعكس player-legacy.ts.
//
// كل دالة مُصدَّرة هنا **نفس توقيع/نوع إرجاع نظيرتها بـplayer-legacy.ts حرفياً** — هذا هو عقد الـAdapter:
// player.ts (المُنتقي) يستبدل التنفيذ فقط، الأنواع (Domain Model) والمستهلكون (page.tsx/المكوّنات) لا يتغيّرون.
//
// فرق التسمية الوحيد المتحقَّق (مقارنة حيّة، راجع سجل المحادثة): snake_case من Laravel
// (`national_team`, `competitor_logo`, `rating_color`, `competition_id`) ⇐ camelCase هنا — لا فرق بالبيانات نفسها.

const REVALIDATE = 3600; // ساعة — الباك إند نفسه يخزّن ٦ ساعات (CacheTtl::SPORT_PLAYER)؛ هذا تخفيف إضافي فوقه.

interface RawTeam {
  id: number;
  name: string;
  logo: string | null;
}
interface RawCompetition {
  id: number;
  name: string;
  logo: string | null;
}
interface RawCareerSection {
  name: string;
  columns: { num: number; name: string }[];
  rows: { competition_id: number; title: string; values: Record<string, string> }[];
}
interface RawTrophyGroup {
  competition: string;
  count: number;
  columns: { num: number; name: string }[];
  rows: { competitor: string; competitor_logo: string | null; season: string | null; values: Record<string, string> }[];
}
interface RawGame {
  id: number;
  competition: string | null;
  date: string | null;
  home: { name: string; logo: string | null; score: number | null };
  away: { name: string; logo: string | null; score: number | null };
  minutes: string | null;
  goals: string | null;
  rating: string | null;
  rating_color: string | null;
}
interface RawAggregate {
  found: boolean;
  partial?: boolean;
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  nationality: string | null;
  age: number | null;
  club: RawTeam | null;
  national_team: RawTeam | null;
  teams: RawTeam[];
  competitions: RawCompetition[];
  career: RawCareerSection[];
  trophies: RawTrophyGroup[];
  recent_games: RawGame[];
}

// نداء واحد مشترَك (React `cache()`) — getPlayer/getPlayerCareerData/getPlayerTrophies/getPlayerLastMatches
// الأربعة تنادي هالدالة نفسها بنفس athleteId ضمن نفس دورة الصفحة ⇒ نداء شبكة واحد فعليّ لا أربعة،
// بفضل تمييز React لنفس (دالة، مدخلات) ضمن شجرة رندر واحدة.
const fetchAggregate = cache(async (athleteId: number): Promise<RawAggregate | null> => {
  if (!Number.isInteger(athleteId) || athleteId <= 0 || !env.apiBaseUrl) return null;
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/sports/players/${athleteId}`, {
      headers: env.internalHeaders,
      // مهلة أطول من نداء 365 مباشر واحد (6-8s) عمداً: أول زيارة بعد انتهاء صلاحية كاش الباك إند
      // تُطلق حتى ٣٠ نداء متوازٍ هناك (Http::pool) — الزيارات التالية ترجع فوراً من كاش Laravel.
      signal: AbortSignal.timeout(15000),
      next: { revalidate: REVALIDATE, tags: ['sport-stats', `sport-player-aggregate:${athleteId}`] },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data || data.found !== true) return null;

    return data as RawAggregate;
  } catch {
    return null;
  }
});

function toTeam(t: RawTeam | null): PlayerTeam | null {
  return t ? { id: t.id, name: t.name, logo: t.logo } : null;
}

export const getPlayer = cache(async (id: number): Promise<PlayerProfile | null> => {
  const a = await fetchAggregate(id);
  if (a === null) return null;

  const club = toTeam(a.club);
  const nationalTeam = toTeam(a.national_team);

  return {
    id: a.id,
    name: a.name,
    photo: a.photo,
    position: a.position,
    nationality: a.nationality,
    age: a.age,
    club,
    nationalTeam,
    teams: a.teams.map((t) => ({ id: t.id, name: t.name, logo: t.logo })),
    competitions: a.competitions.map((c) => ({ id: c.id, name: c.name, logo: c.logo })),
  };
});

export const getPlayerCareerData = cache(async (athleteId: number): Promise<PlayerCareerData> => {
  const a = await fetchAggregate(athleteId);
  if (a === null) return { sections: [], competitions: [] };

  const sections: CareerSection[] = a.career.map((s) => ({
    name: s.name,
    columns: s.columns,
    rows: s.rows.map((r) => ({ competitionId: r.competition_id, title: r.title, values: r.values })),
  }));

  // `competitions` هنا لا تُستهلَك فعلياً بوضع aggregate — الألقاب مُجمَّعة سلفاً بالباك إند (نفس
  // منطق player-legacy.ts، لكن داخل PlayerAggregateService لا هنا)، فـgetPlayerTrophies بالأسفل
  // يتجاهل معامِلها الثاني في هذا الوضع. مصفوفة فارغة كافية للحفاظ على شكل PlayerCareerData.
  return { sections, competitions: [] };
});

// المعامل الثاني (`_competitions`) موجود فقط للحفاظ على نفس توقيع player-legacy.ts (page.tsx تناديها
// بـ`getPlayerTrophies(pid, career.competitions)` دون تفريق بين المزوّدَين) — يُتجاهَل هنا عمداً لأن
// الألقاب وصلت مُجمَّعة سلفاً ضمن نفس نداء fetchAggregate الواحد (لا حاجة لإعادة حسابها من قائمة بطولات).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- توقيع مطابق عمداً لـplayer-legacy.ts، راجع التعليق أعلاه.
export const getPlayerTrophies = cache(async (athleteId: number, _competitions: { id: number; name: string }[]): Promise<TrophyGroup[]> => {
  const a = await fetchAggregate(athleteId);
  if (a === null) return [];

  return a.trophies.map((g) => ({
    competition: g.competition,
    count: g.count,
    columns: g.columns,
    rows: g.rows.map((r) => ({
      competitor: r.competitor,
      competitorLogo: r.competitor_logo,
      season: r.season,
      values: r.values,
    })),
  }));
});

export const getPlayerLastMatches = cache(async (athleteId: number, limit = 10): Promise<PlayerGame[]> => {
  const a = await fetchAggregate(athleteId);
  if (a === null) return [];

  return a.recent_games.slice(0, limit).map((g) => ({
    id: g.id,
    competition: g.competition,
    date: g.date,
    home: g.home,
    away: g.away,
    minutes: g.minutes,
    goals: g.goals,
    rating: g.rating,
    ratingColor: g.rating_color,
  }));
});

export const aggregatePlayerProvider: PlayerProvider = {
  getPlayer,
  getPlayerCareerData,
  getPlayerTrophies,
  getPlayerLastMatches,
};

import 'server-only';
import { cache } from 'react';

import { env } from '@/lib/env';

import type { TeamProvider } from './providers';
import type { Standings, TeamPage } from './stats';

// مزوّد "Aggregate" — نداء داخلي واحد لـLaravel (`GET /api/v1/sports/teams/{id}`، TeamAggregateService)
// يضمّ ملف الفريق + بطولاته + ترتيب دوريه الرئيس معاً، بدل نداءين منفصلين لـ365Scores كان يطلقهما
// team-legacy.ts (competitors/ ثم standings/ بالتسلسل). راجع TeamAggregateService للتفصيل الخادميّ.
//
// نفس عقد الـAdapter المُتَّبَع بـplayer-aggregate.ts/match-aggregate.ts: كل دالة هنا نفس توقيع/نوع
// إرجاع نظيرتها بـteam-legacy.ts حرفياً — التحويل snake_case ⇐ camelCase فقط، لا حساب/فلترة/قيم افتراضية.

const REVALIDATE = 3600; // ساعة — الباك إند نفسه يخزّن ٦ ساعات (CacheTtl::SPORT_TEAM)؛ هذا تخفيف إضافي فوقه.

interface RawCompetitionRef {
  id: number;
  name: string;
  logo: string | null;
}
interface RawStandingRow {
  rank: number;
  is_winner: boolean;
  zone_color: string | null;
  group_num: number | null;
  team: { id: number; name: string; logo: string | null };
  played: number;
  won: number;
  draw: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  diff: number;
  points: number;
  form: { outcome: number; game_id: number | null }[];
}
interface RawStandings {
  competition: { id: number; name: string; logo: string | null };
  rows: RawStandingRow[];
  zones: { name: string; color: string }[];
  groups: { num: number; name: string }[];
}
interface RawAggregate {
  found: boolean;
  partial?: boolean;
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
  main_competition_id: number | null;
  competitions: RawCompetitionRef[];
  standings: RawStandings | null;
}

// نداء واحد مشترَك (React `cache()`) — getTeam/getStandings تناديان هالدالة نفسها بنفس teamId ضمن
// نفس دورة الصفحة ⇒ نداء شبكة واحد فعليّ لا اثنان.
const fetchTeamAggregate = cache(async (teamId: number): Promise<RawAggregate | null> => {
  if (!Number.isInteger(teamId) || teamId <= 0 || !env.apiBaseUrl) return null;
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/sports/teams/${teamId}`, {
      headers: env.internalHeaders,
      signal: AbortSignal.timeout(10000),
      next: { revalidate: REVALIDATE, tags: ['sport-stats', `sport-team-aggregate:${teamId}`] },
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

function toStandings(s: RawStandings | null): Standings | null {
  if (s === null) return null;

  return {
    competition: s.competition,
    rows: s.rows.map((r) => ({
      rank: r.rank,
      isWinner: r.is_winner,
      zoneColor: r.zone_color,
      groupNum: r.group_num,
      team: r.team,
      played: r.played,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      goalsFor: r.goals_for,
      goalsAgainst: r.goals_against,
      diff: r.diff,
      points: r.points,
      form: r.form.map((f) => ({ outcome: f.outcome, gameId: f.game_id })),
    })),
    zones: s.zones,
    groups: s.groups,
  };
}

export const getTeam = cache(async (id: number): Promise<TeamPage | null> => {
  const a = await fetchTeamAggregate(id);
  if (a === null) return null;

  return {
    id: a.id,
    name: a.name,
    logo: a.logo,
    country: a.country,
    mainCompetitionId: a.main_competition_id,
    competitions: a.competitions,
  };
});

export const getStandings = cache(async (teamId: number): Promise<Standings | null> => {
  const a = await fetchTeamAggregate(teamId);
  if (a === null) return null;

  return toStandings(a.standings);
});

export const aggregateTeamProvider: TeamProvider = { getTeam, getStandings };

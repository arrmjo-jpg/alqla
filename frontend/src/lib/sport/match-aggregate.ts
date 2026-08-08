import 'server-only';
import { cache } from 'react';

import { env } from '@/lib/env';

import type { CommentaryEvent, CommentaryStage, GameDetail, LineupPlayer, MatchEvent, MatchSide, TeamLineup, TopPerfCategory, TopPerfPlayer } from './games';
import type { MatchProvider } from './providers';

// مزوّد "Aggregate" — نداء واحد لـLaravel (`GET /api/v1/sports/matches/{id}?profile=base`،
// MatchAggregateService) بدل نداء `game/` المباشر لـ365Scores الذي كانت الواجهة تطلقه لكل زيارة.
// يغطي `getGameDetail` فقط — راجع providers.ts للسبب المعماري وراء بقاء getCompetitionMeta/
// getCompetitionMatchList خارج العقد (قرار مقصود، لا نقص يُتحايَل عليه).
//
// هذا الملف Adapter بحت — تحويل تسمية فقط (snake_case ⇐ camelCase)، **بلا أي حساب أو فلترة أو
// Defaults إضافية** بما يتجاوز ما يفعله المزوّد الأصليّ أصلاً. أي منطق/حساب مكانه الطبيعي
// MatchAggregateService بالباك إند لا هنا.

const REVALIDATE = 60; // الباك إند نفسه يخزّن CacheTtl::SPORT_MATCH_BASE (60ث، حسّاس للنتيجة الحيّة).

interface RawSide {
  name: string;
  score: number | null;
  color: string | null;
  logo: string | null;
}
interface RawEvent {
  minute: string | null;
  side: 'home' | 'away';
  type: MatchEvent['type'];
  player: string | null;
}
interface RawLineupPlayer {
  id: number;
  name: string;
  jersey: number | null;
  position: string | null;
  ranking: number | null;
  photo: string | null;
  club_logo: string | null;
  x: number | null;
  y: number | null;
}
interface RawLineup {
  formation: string | null;
  starters: RawLineupPlayer[];
  bench: RawLineupPlayer[];
}
interface RawTopPerfPlayer {
  id: number;
  name: string | null;
  photo: string | null;
  position: string | null;
  stats: { name: string; value: string }[];
}
interface RawTopPerfCategory {
  name: string;
  home: RawTopPerfPlayer | null;
  away: RawTopPerfPlayer | null;
}
interface RawCommentaryPlayer {
  id: number;
  name: string | null;
  photo: string | null;
}
interface RawCommentaryEvent {
  side: 'home' | 'away';
  minute: string;
  type: CommentaryEvent['type'];
  major: boolean;
  player: RawCommentaryPlayer | null;
  player_out: RawCommentaryPlayer | null;
}
interface RawCommentaryStage {
  name: string;
  home_score: number | null;
  away_score: number | null;
  events: RawCommentaryEvent[];
}
interface RawMatchBase {
  found: boolean;
  partial?: boolean;
  id: number;
  competition_id: number | null;
  competition: string | null;
  competition_logo: string | null;
  round: string | null;
  group: string | null;
  venue: string | null;
  venue_capacity: number | null;
  start_time: string | null;
  kind: GameDetail['kind'];
  status_text: string | null;
  minute: string | null;
  home: RawSide;
  away: RawSide;
  home_id: number | null;
  away_id: number | null;
  events: RawEvent[];
  referee: string | null;
  home_lineup: RawLineup | null;
  away_lineup: RawLineup | null;
  has_lineups: boolean;
  has_stats: boolean;
  has_previous_meetings: boolean;
  top_performers: RawTopPerfCategory[];
  commentary: RawCommentaryStage[];
  // competition_meta/competition_match_list موجودتان بالاستجابة الفعلية لكن غير مُستهلَكتين هنا
  // عمداً — راجع providers.ts (MatchProvider لا يغطيهما، تبقيان Legacy دائماً).
}

const fetchMatchBase = cache(async (gameId: number): Promise<RawMatchBase | null> => {
  if (!Number.isInteger(gameId) || gameId <= 0 || !env.apiBaseUrl) return null;
  try {
    const res = await fetch(`${env.apiBaseUrl}/api/v1/sports/matches/${gameId}?profile=base`, {
      headers: env.internalHeaders,
      signal: AbortSignal.timeout(15000),
      next: { revalidate: REVALIDATE, tags: ['sport-stats', `sport-match-aggregate:${gameId}`] },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data || data.found !== true) return null;

    return data as RawMatchBase;
  } catch {
    return null;
  }
});

const side = (s: RawSide): MatchSide => ({ name: s.name, score: s.score, color: s.color, logo: s.logo });

const lineupPlayer = (p: RawLineupPlayer): LineupPlayer => ({
  id: p.id,
  name: p.name,
  jersey: p.jersey,
  position: p.position,
  ranking: p.ranking,
  photo: p.photo,
  clubLogo: p.club_logo,
  x: p.x,
  y: p.y,
});

const lineup = (l: RawLineup | null): TeamLineup | null =>
  l === null ? null : { formation: l.formation, starters: l.starters.map(lineupPlayer), bench: l.bench.map(lineupPlayer) };

const topPerfPlayer = (p: RawTopPerfPlayer | null): TopPerfPlayer | null =>
  p === null ? null : { id: p.id, name: p.name, photo: p.photo, position: p.position, stats: p.stats };

const commentaryPlayer = (p: RawCommentaryPlayer | null) => (p === null ? null : { id: p.id, name: p.name, photo: p.photo });

export const aggregateMatchProvider: MatchProvider = {
  getGameDetail: cache(async (gameId: number): Promise<GameDetail | null> => {
    const d = await fetchMatchBase(gameId);
    if (d === null) return null;

    return {
      id: d.id,
      competitionId: d.competition_id,
      competition: d.competition,
      competitionLogo: d.competition_logo,
      round: d.round,
      group: d.group,
      venue: d.venue,
      venueCapacity: d.venue_capacity,
      startTime: d.start_time,
      kind: d.kind,
      statusText: d.status_text,
      minute: d.minute,
      home: side(d.home),
      away: side(d.away),
      homeId: d.home_id,
      awayId: d.away_id,
      events: d.events.map((e): MatchEvent => ({ minute: e.minute, side: e.side, type: e.type, player: e.player })),
      referee: d.referee,
      homeLineup: lineup(d.home_lineup),
      awayLineup: lineup(d.away_lineup),
      hasLineups: d.has_lineups,
      hasStats: d.has_stats,
      hasPreviousMeetings: d.has_previous_meetings,
      topPerformers: d.top_performers.map(
        (c): TopPerfCategory => ({ name: c.name, home: topPerfPlayer(c.home), away: topPerfPlayer(c.away) }),
      ),
      commentary: d.commentary.map(
        (s): CommentaryStage => ({
          name: s.name,
          homeScore: s.home_score,
          awayScore: s.away_score,
          events: s.events.map(
            (e): CommentaryEvent => ({
              side: e.side,
              minute: e.minute,
              type: e.type,
              major: e.major,
              player: commentaryPlayer(e.player),
              playerOut: commentaryPlayer(e.player_out),
            }),
          ),
        }),
      ),
    };
  }),
};

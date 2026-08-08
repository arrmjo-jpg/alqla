import 'server-only';
import { cache } from 'react';

import type { TeamProvider } from './providers';
import { getStandings as getStandingsByCompetition, getTeam as fetchTeam } from './stats';

// مزوّد "Legacy" — نداءا 365Scores مباشرة من Next.js كما كانا قبل TeamAggregateService (getTeam +
// getStandings من stats.ts، السلوك الأصليّ 1:1). يبقى موجوداً كخيار Feature Flag
// (`SPORT_TEAM_PROVIDER=legacy`, الافتراضي حالياً) — راجع team.ts (المُنتقي) وteam-aggregate.ts.
//
// getStandings هنا بمعرّف الفريق (TeamProvider يلزم ذلك، راجع providers.ts) لا البطولة — نحلّ
// mainCompetitionId من getTeam أولاً. لا نداء شبكة إضافي فعلياً: React `cache()` يُلغي التكرار إن
// كانت getTeam(teamId) استُدعيت سلفاً بنفس teamId ضمن نفس الطلب (حال page.tsx دائماً).
export const legacyTeamProvider: TeamProvider = {
  getTeam: fetchTeam,
  getStandings: cache(async (teamId: number) => {
    const team = await fetchTeam(teamId);

    return team?.mainCompetitionId ? getStandingsByCompetition(team.mainCompetitionId) : null;
  }),
};

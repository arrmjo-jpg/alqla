import 'server-only';

import type { TeamProvider } from './providers';
import { aggregateTeamProvider } from './team-aggregate';
import { legacyTeamProvider } from './team-legacy';

// نقطة الدخول العامة لبيانات الفريق — لا تحوي أي منطق جلب بنفسها، فقط تختار Provider واحد (يُلزَم
// بعقد TeamProvider، راجع providers.ts) وتُصدِّر دواله. نفس نمط player.ts/match.ts حرفياً.
//
//   SPORT_TEAM_PROVIDER=legacy    (افتراضي — لا تغيير بالسلوك الحالي، آمن 100%)
//   SPORT_TEAM_PROVIDER=aggregate (نداء واحد لكل فريق عبر TeamAggregateService بدل نداءين متسلسلين)
//
// راجع team-legacy.ts وteam-aggregate.ts.
const provider: TeamProvider = process.env.SPORT_TEAM_PROVIDER === 'aggregate' ? aggregateTeamProvider : legacyTeamProvider;

export const { getTeam, getStandings } = provider;

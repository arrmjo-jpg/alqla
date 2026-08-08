import 'server-only';

import { getCompetitionMatchList } from './games';
import { aggregateMatchProvider } from './match-aggregate';
import { legacyMatchProvider } from './match-legacy';
import type { MatchProvider } from './providers';
import { getCompetitionMeta } from './stats';

// نقطة الدخول العامة لبيانات المباراة — لا تحوي أي منطق جلب بنفسها، فقط تختار Provider واحد (يُلزَم
// بعقد MatchProvider، راجع providers.ts) وتُصدِّر getGameDetail منه. المستهلك (match/[id]/page.tsx)
// يستورد getGameDetail من هنا بدل games.ts مباشرة — تغيير مصدر الاستيراد فقط (سطر واحد)، صفر تغيير
// بالمنطق/الـJSX. باقي دوال المباراة (B: standings/shotMap/h2h/stats/trends + getCompetitionMeta/
// getCompetitionMatchList) تبقى تُستورَد من games.ts/stats.ts كما كانت تماماً — خارج تبديل المزوّد،
// أُعاد تصديرهما هنا فقط للراحة (نفس المصدر والسلوك، صفر تغيير).
//
//   SPORT_MATCH_PROVIDER=legacy    (افتراضي — لا تغيير بالسلوك الحالي، آمن 100%)
//   SPORT_MATCH_PROVIDER=aggregate (getGameDetail عبر MatchAggregateService بدل 365Scores مباشرة)
//
// راجع match-legacy.ts وmatch-aggregate.ts وproviders.ts (سبب بقاء competitionMeta/competitionMatchList
// خارج العقد — قرار معماري مقصود، لا Stub ولا Backend جديد).
const provider: MatchProvider = process.env.SPORT_MATCH_PROVIDER === 'aggregate' ? aggregateMatchProvider : legacyMatchProvider;

export const { getGameDetail } = provider;

export { getCompetitionMeta, getCompetitionMatchList };

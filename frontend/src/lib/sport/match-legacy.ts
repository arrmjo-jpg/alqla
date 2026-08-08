import 'server-only';

import { getGameDetail } from './games';
import type { MatchProvider } from './providers';

/** مزوّد "Legacy" — تركيب (composition) فوق الدالة الأصليّة بـgames.ts، بلا نسخ أو تعديل منطقها.
 * يبقى الخيار الافتراضي (`SPORT_MATCH_PROVIDER=legacy`) — راجع match.ts (المُنتقي). فقط getGameDetail
 * جزء من العقد (راجع providers.ts للسبب) — getCompetitionMeta/getCompetitionMatchList يُصدَّران من
 * match.ts مباشرة من مصدرهما الأصلي، خارج تبديل المزوّد بالكامل. */
export const legacyMatchProvider: MatchProvider = {
  getGameDetail,
};

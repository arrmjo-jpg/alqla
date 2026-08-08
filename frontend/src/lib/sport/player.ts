import 'server-only';

import { aggregatePlayerProvider } from './player-aggregate';
import { getPlayerStats, getTeamSquad, legacyPlayerProvider } from './player-legacy';
import type { PlayerProvider } from './providers';

// نقطة الدخول العامة لبيانات اللاعب — لا تحوي أي منطق جلب بنفسها، فقط تختار Provider واحد (يُلزَم
// بعقد PlayerProvider، راجع providers.ts) وتُصدِّر دواله. المستهلكون (page.tsx، player-widgets.tsx،
// player-stats.tsx، competition-carousel.tsx) يستوردون من هنا حصراً ولا يتغيّرون أبداً بتبديل
// المزوّد — هذا هو كامل الغرض من طبقة الانتقال (Transition Layer).
//
//   SPORT_PLAYER_PROVIDER=legacy    (افتراضي — لا تغيير بالسلوك الحالي، آمن 100%)
//   SPORT_PLAYER_PROVIDER=aggregate (نداء واحد لكل لاعب عبر PlayerAggregateService بدل حتى ٣٠ نداء)
//
// راجع player-legacy.ts وplayer-aggregate.ts. `getPlayerStats`/`getTeamSquad` تبقيان مباشرة على
// 365Scores دائماً بغضّ النظر عن المزوّد — خارج عقد PlayerProvider عمداً (بيانات تعتمد على تبويب/فريق
// نشط، لا جزء من التجميع الثابت لكل لاعب — راجع نقاش نطاق المرحلة 1).
const provider: PlayerProvider = process.env.SPORT_PLAYER_PROVIDER === 'aggregate' ? aggregatePlayerProvider : legacyPlayerProvider;

export type {
  CareerColumn,
  CareerRow,
  CareerSection,
  PlayerCareerData,
  PlayerCompetition,
  PlayerGame,
  PlayerProfile,
  PlayerStat,
  PlayerTeam,
  SquadPlayer,
  TrophyColumn,
  TrophyGroup,
  TrophyWinRow,
} from './player-legacy';

export const { getPlayer, getPlayerCareerData, getPlayerTrophies, getPlayerLastMatches } = provider;

export { getPlayerStats, getTeamSquad };

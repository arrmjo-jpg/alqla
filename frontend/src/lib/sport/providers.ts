import 'server-only';

import type { GameDetail } from './games';
import type { PlayerCareerData, PlayerGame, PlayerProfile, TrophyGroup } from './player-legacy';
import type { Standings, TeamPage } from './stats';

// عقود المزوّدين — أي Provider (Legacy365Scores أو AggregateApi أو أي بديل مستقبلي: Mock/Offline...)
// يُلزَم بنفس التوقيع، فيصبح استبداله أو إضافة ثالث آمناً (خطأ تجميع TypeScript فوراً عند عدم التطابق)
// بدل الاعتماد على أن كل دالة "تصادف" نفس التوقيع بلا رقابة. يغطي فقط ما هو مُبدَّل فعلياً 1:1 عبر
// Feature Flag — أي دالة ليس لها مقابل Aggregate حقيقي بلا Backend جديد تبقى خارج العقد عمداً (قرار
// معماري مقصود، لا نقص) وتُستورَد مباشرة من مصدرها الأصلي بمستودعها (match.ts/player.ts).

export interface PlayerProvider {
  getPlayer(id: number): Promise<PlayerProfile | null>;
  getPlayerCareerData(athleteId: number): Promise<PlayerCareerData>;
  getPlayerTrophies(athleteId: number, competitions: { id: number; name: string }[]): Promise<TrophyGroup[]>;
  getPlayerLastMatches(athleteId: number, limit?: number): Promise<PlayerGame[]>;
}

/**
 * فقط getGameDetail — الوحيدة بتطابق 1:1 حقيقي مع MatchAggregateService::aggregateBase (نفس المعرّف
 * `gameId`، نفس شكل البيانات). getCompetitionMeta/getCompetitionMatchList تُستدعَيان بـ`competitionId`
 * (مستخرَج من نتيجة getGameDetail بعد جلبها) لا بـ`gameId` — الباك إند الحالي يعرض بيانات البطولة
 * ضمن استجابة المباراة فقط، لا endpoint بطولة مستقل بمعرّفها وحدها. أي "تحويل" لهما هنا كان سيحتاج
 * تخزيناً جانبياً هشّاً أو Backend جديد — كلاهما خارج نطاق Adapter بحت، فبقيتا Legacy دائماً بقرار
 * معماري مقصود (راجع match.ts، match-legacy.ts).
 */
export interface MatchProvider {
  getGameDetail(gameId: number): Promise<GameDetail | null>;
}

/**
 * getTeam بمعرّف الفريق كالمعتاد. getStandings هنا **بمعرّف الفريق (teamId) لا البطولة** — بعكس
 * stats.ts::getStandings العامة (competitionId، مستخدَمة مباشرة بصفحات المباراة/البطولة). الفرق مقصود:
 * TeamAggregateService يضمّ الترتيب ضمن نفس نداء الفريق (عبر mainCompetitionId داخلياً — راجع قرار
 * "الترتيب جزء من هوية الصفحة" بسجل المحادثة)، فلا معنى لعقد Adapter يحتاج competitionId مستقلاً هنا؛
 * كلا المُنفِّذَين (Legacy/Aggregate) يحلّان mainCompetitionId داخلياً من teamId نفسه.
 */
export interface TeamProvider {
  getTeam(id: number): Promise<TeamPage | null>;
  getStandings(teamId: number): Promise<Standings | null>;
}

<?php

declare(strict_types=1);

namespace App\Support\Cache;

/**
 * وسوم كاش بيانات الرياضة المُجمَّعة من مزوّد خارجي (365Scores عبر PlayerAggregateService
 * وما يليه من خدمات تجميع مماثلة) — بعكس VideoCacheTags/ReelCacheTags، لا يوجد حدث "كتابة محليّة"
 * يُبطِل الكاش هنا (البيانات لا تُنشَأ من نموذج Eloquent محليّ)؛ الإبطال دائماً يدويّ (أمر artisan
 * أو TTL طبيعيّ) — الوسم لكل كيان (لاعب/فريق/مباراة) يتيح إبطالاً حبيبياً عند الحاجة دون تفريغ كل
 * كاش الرياضة (ALL).
 */
final class SportCacheTags
{
    public const ALL = 'sport';

    public static function player(int $athleteId): string
    {
        return self::make('player', $athleteId);
    }

    /** @return array<int,string> */
    public static function playerTags(int $athleteId): array
    {
        return [self::ALL, self::player($athleteId)];
    }

    /** كل Profile لنفس المباراة يشترك بوسم المباراة (إبطال حبيبي واحد يمسح كل profiles تلك المباراة معاً). */
    public static function match(int $gameId): string
    {
        return self::make('match', $gameId);
    }

    /** @return array<int,string> */
    public static function matchTags(int $gameId): array
    {
        return [self::ALL, self::match($gameId)];
    }

    public static function team(int $teamId): string
    {
        return self::make('team', $teamId);
    }

    /** @return array<int,string> */
    public static function teamTags(int $teamId): array
    {
        return [self::ALL, self::team($teamId)];
    }

    private static function make(string $kind, int $id): string
    {
        return self::ALL.':'.$kind.':'.$id;
    }
}

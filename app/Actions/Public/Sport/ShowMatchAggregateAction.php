<?php

declare(strict_types=1);

namespace App\Actions\Public\Sport;

use App\Support\Cache\CachedRead;
use App\Support\Cache\CacheKeys;
use App\Support\Cache\CacheTtl;
use App\Support\Cache\SportCacheTags;
use App\Support\Responses\ApiResponse;
use App\Support\Sport\MatchAggregateService;
use App\Support\Sport\MatchProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * تجميع مباراة — بـProfiles (MatchProfile، راجع MatchAggregateService). حالياً Base فقط مدعوم
 * (الجزء المُجلَب دائماً بغضّ النظر عن التبويب) — Overview/Stats/Trends محجوزة بالـenum، تُفعَّل
 * تباعاً، كل واحد بمفتاح كاش مستقل (CacheKeys::sportMatchAggregate) حتى لا يُبطِل أحدها البقية.
 */
final class ShowMatchAggregateAction
{
    public function __construct(private readonly MatchAggregateService $service) {}

    public function handle(int $gameId, string $profileParam = 'base'): JsonResponse
    {
        if ($gameId <= 0) {
            return ApiResponse::error(__('sport.invalid_match_id'), [], 422);
        }

        $profile = MatchProfile::tryFrom($profileParam);
        if ($profile === null || ! $profile->isSupported()) {
            return ApiResponse::error(__('sport.invalid_profile'), [], 422);
        }

        $tags = SportCacheTags::matchTags($gameId);
        $key = CacheKeys::sportMatchAggregate($gameId, $profile);

        $isDev = ! app()->environment('production');
        $wasHit = $isDev && Cache::tags($tags)->has($key);

        $payload = CachedRead::remember($tags, $key, CacheTtl::SPORT_MATCH_BASE, fn (): array => $this->service->aggregate($gameId, $profile));

        if (($payload['found'] ?? false) !== true) {
            return ApiResponse::error(__('sport.match_not_found'), [], 404);
        }

        $response = ApiResponse::success(data: $payload);

        if ($isDev) {
            $response->headers->set('X-Sport-Provider', 'aggregate');
            $response->headers->set('X-Sport-Profile', $profile->value);
            $response->headers->set('X-Aggregate-Cache', $wasHit ? 'hit' : 'miss');
        }

        return $response;
    }
}

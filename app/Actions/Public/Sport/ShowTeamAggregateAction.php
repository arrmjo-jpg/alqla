<?php

declare(strict_types=1);

namespace App\Actions\Public\Sport;

use App\Support\Cache\CachedRead;
use App\Support\Cache\CacheKeys;
use App\Support\Cache\CacheTtl;
use App\Support\Cache\SportCacheTags;
use App\Support\Responses\ApiResponse;
use App\Support\Sport\TeamAggregateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * تجميع فريق واحد — مفتاح كاش واحد لكل فريق، لا Profiles (راجع TeamAggregateService). نفس نمط
 * ShowPlayerAggregateAction/ShowMatchAggregateAction حرفياً.
 */
final class ShowTeamAggregateAction
{
    public function __construct(private readonly TeamAggregateService $service) {}

    public function handle(int $teamId): JsonResponse
    {
        if ($teamId <= 0) {
            return ApiResponse::error(__('sport.invalid_team_id'), [], 422);
        }

        $tags = SportCacheTags::teamTags($teamId);
        $key = CacheKeys::sportTeamAggregate($teamId);

        $isDev = ! app()->environment('production');
        $wasHit = $isDev && Cache::tags($tags)->has($key);

        $payload = CachedRead::remember($tags, $key, CacheTtl::SPORT_TEAM, fn (): array => $this->service->aggregate($teamId));

        if (($payload['found'] ?? false) !== true) {
            return ApiResponse::error(__('sport.team_not_found'), [], 404);
        }

        $response = ApiResponse::success(data: $payload);

        if ($isDev) {
            $response->headers->set('X-Sport-Provider', 'aggregate');
            $response->headers->set('X-Aggregate-Cache', $wasHit ? 'hit' : 'miss');
        }

        return $response;
    }
}

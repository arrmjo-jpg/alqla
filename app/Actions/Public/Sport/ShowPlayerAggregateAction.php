<?php

declare(strict_types=1);

namespace App\Actions\Public\Sport;

use App\Support\Cache\CachedRead;
use App\Support\Cache\CacheKeys;
use App\Support\Cache\CacheTtl;
use App\Support\Cache\SportCacheTags;
use App\Support\Responses\ApiResponse;
use App\Support\Sport\PlayerAggregateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * تجميع لاعب واحد — مفتاح كاش واحد لكل لاعب (لا لكل موسم/بطولة)، محمي بقفل CachedRead ضدّ
 * عاصفة الطلبات المتزامنة على نفس اللاعب (نفس نمط ShowPublicVideoAction).
 */
final class ShowPlayerAggregateAction
{
    public function __construct(private readonly PlayerAggregateService $service) {}

    public function handle(int $athleteId): JsonResponse
    {
        if ($athleteId <= 0) {
            return ApiResponse::error(__('sport.invalid_player_id'), [], 422);
        }

        $tags = SportCacheTags::playerTags($athleteId);
        $key = CacheKeys::sportPlayerAggregate($athleteId);

        // فحص الحالة *قبل* remember (يملأ المفتاح لو miss) — لتقرير hit/miss دقيق برأس تشخيصي، لا تخمين.
        $isDev = ! app()->environment('production');
        $wasHit = $isDev && Cache::tags($tags)->has($key);

        $payload = CachedRead::remember($tags, $key, CacheTtl::SPORT_PLAYER, fn (): array => $this->service->aggregate($athleteId));

        if (($payload['found'] ?? false) !== true) {
            return ApiResponse::error(__('sport.player_not_found'), [], 404);
        }

        $response = ApiResponse::success(data: $payload);

        // رؤوس تشخيصية مؤقتة — بيئة التطوير فقط (Validation المرحلة 2: التأكد الميداني إن الواجهة
        // فعلاً تستهلك هذا الـ endpoint، وإن الكاش يعمل، لا تخمين). لا تظهر بالإنتاج إطلاقاً.
        if ($isDev) {
            $response->headers->set('X-Sport-Provider', 'aggregate');
            $response->headers->set('X-Aggregate-Cache', $wasHit ? 'hit' : 'miss');
        }

        return $response;
    }
}

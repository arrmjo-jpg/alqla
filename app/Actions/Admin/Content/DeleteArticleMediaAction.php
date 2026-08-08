<?php

declare(strict_types=1);

namespace App\Actions\Admin\Content;

use App\Models\Article;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Content\ArticleCdnPurge;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * يُزيل إسناد أصل من مقال (يُزيل صف pivot فقط — الأصل يبقى في المكتبة).
 *
 * إبطال الكاش (Content Module Audit 2026-08-08 §C1): نفس نطاق UploadArticleMediaAction —
 * حذف الغلاف/صورة من المعرض يظهر أثره بالقوائم العامة أيضاً، لا صفحة التفاصيل فقط.
 */
class DeleteArticleMediaAction
{
    public function handle(Article $article, int $mediaAssetId): JsonResponse
    {
        $exists = $article->mediaAssets()
            ->where('media_assets.id', $mediaAssetId)
            ->exists();

        if (! $exists) {
            return ApiResponse::error(__('media.not_found'), [], 404);
        }

        $article->mediaAssets()->detach($mediaAssetId);

        $fresh = $article->fresh();
        Cache::tags(ArticleCacheTags::writeTags($fresh))->flush();
        ArticleCdnPurge::purge($fresh);

        return ApiResponse::success(__('media.deleted'));
    }
}

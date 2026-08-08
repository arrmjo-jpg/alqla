<?php

declare(strict_types=1);

namespace App\Actions\Admin\Content;

use App\Actions\Admin\Media\StoreMediaAssetAction;
use App\Http\Resources\Admin\Content\ArticleResource;
use App\Models\Article;
use App\Models\User;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Content\ArticleCdnPurge;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * رفع ملف إلى المكتبة المركزية وإسناده إلى المقال ضمن مجموعة (P9.2 B.2a).
 *
 * - cover: صف واحد فقط — يُزاح القديم قبل الإضافة (ليس حذفاً من المكتبة).
 * - gallery/inline/video: تُضاف بترتيب تصاعدي (آخر position + 1).
 * - dedupe بالـ checksum يُدار في StoreMediaAssetAction.
 * - المشتقّات (thumb/medium/watermarked) تُولَّد في StoreMediaAssetAction
 *   عبر GenerateMediaAssetConversionsJob — لا علامة مائية خاصة بالمقال.
 * - إبطال الكاش (Content Module Audit 2026-08-08 §C1): الغلاف يظهر بالقوائم العامة أيضاً
 *   (PublicArticleListItemResource::coverItem)، فيبطُل نفس نطاق UpdateArticleAction —
 *   Backend (ArticleCacheTags::writeTags) + Next.js/CDN (ArticleCdnPurge) معاً، لا Backend فقط.
 */
class UploadArticleMediaAction
{
    public function handle(
        Article $article,
        string $collection,
        UploadedFile $file,
        User $actor,
    ): JsonResponse {
        $asset = (new StoreMediaAssetAction)->handle($file, $actor);

        DB::transaction(function () use ($article, $asset, $collection): void {
            // cover: مجموعة من صف واحد — نزع أي غلاف سابق من الـ pivot
            if ($collection === 'cover') {
                $article->mediaAssets()
                    ->wherePivot('collection', 'cover')
                    ->detach();
            }

            // احسب الموضع التالي ضمن المجموعة
            $maxPosition = $article->mediaAssets()
                ->wherePivot('collection', $collection)
                ->max('article_media.position');

            $position = $maxPosition === null ? 0 : (int) $maxPosition + 1;

            $article->mediaAssets()->attach($asset->id, [
                'collection' => $collection,
                'position' => $position,
            ]);
        });

        $fresh = $article->fresh();
        Cache::tags(ArticleCacheTags::writeTags($fresh))->flush();
        ArticleCdnPurge::purge($fresh);

        return ApiResponse::success(
            __('media.uploaded'),
            new ArticleResource(
                $fresh->load([
                    'author:id,name',
                    'primaryCategory:id,name,slug',
                    'categories:id,name,slug',
                    'tags',
                    'mediaAssets',
                ])
            ),
            201,
        );
    }
}

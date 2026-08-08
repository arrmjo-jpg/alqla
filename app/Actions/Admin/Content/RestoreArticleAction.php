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
 * الاسترجاع صلاحية إشرافية (Moderation) — يُحكَم فقط بصلاحية الراوت `articles.restore`
 * (لا فحص ملكية، بنفس منطق DeleteArticleAction). قرار مقصود موثَّق بـDECISION-LOG.md
 * § DEC-005 — لا تُضِف فحص ملكية هنا بلا مراجعة ذلك القرار أولاً.
 */
class RestoreArticleAction
{
    public function handle(Article $article): JsonResponse
    {
        if (! $article->trashed()) {
            return ApiResponse::error(__('article.not_trashed'), [], 422);
        }

        $article->restore();

        Cache::tags(ArticleCacheTags::writeTags($article))->flush();
        ArticleCdnPurge::purge($article);

        return ApiResponse::success(__('article.restored'));
    }
}

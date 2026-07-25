<?php

declare(strict_types=1);

namespace App\Support\Cache;

use App\Models\MediaAsset;
use App\Support\Advertising\AdServingInvalidator;
use App\Support\Frontend\FrontendCacheTags;
use App\Support\Frontend\FrontendRevalidate;
use Illuminate\Support\Facades\Cache;

/**
 * إبطال كاش أصل وسائط عبر كل مالكيه (MediaUsage::RELATIONS) — يُستدعى عند تعديل
 * البيانات الوصفية التحريرية (alt/caption)، حذف، أو جهوزية مشتقّات معالَجة، لأن
 * تعديل الأصل نفسه لا يُعيد حفظ المحتوى المالك (Article/Category/...) فتبقى صفحته
 * المُخبَّأة على القيم القديمة دون هذا الإبطال الصريح.
 *
 * يُفوِّض حصراً لمنطق بناء الوسوم الموجود أصلاً لكل نوع (ArticleCacheTags،
 * ReelCacheTags، ...) بدل إعادة اختراع سلاسل الوسوم — لو تغيّر منطق الإبطال لأي
 * نوع مستقبلاً، هذا الصنف يرث الإصلاح تلقائياً بلا تكرار. epapers/epaperVersions
 * مُستبعدة عمداً (غير مخبَّأة للعامّة، راجع تدقيق الكاش).
 */
final class MediaCacheInvalidator
{
    public static function invalidate(MediaAsset $asset): void
    {
        $backendTags = [];
        $frontendTags = [];

        foreach ($asset->articles as $article) {
            $backendTags = array_merge($backendTags, ArticleCacheTags::writeTags($article));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::article($article));
        }

        foreach ($asset->articleOgImages as $article) {
            $backendTags = array_merge($backendTags, ArticleCacheTags::writeTags($article));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::article($article));
        }

        foreach ($asset->liveUpdates as $liveUpdate) {
            $backendTags[] = 'live_updates';
            $liveUpdate->loadMissing('article');
            if ($liveUpdate->article !== null) {
                $frontendTags = array_merge($frontendTags, FrontendCacheTags::liveUpdates($liveUpdate->article));
            }
        }

        foreach ($asset->reels as $reel) {
            $backendTags = array_merge($backendTags, ReelCacheTags::invalidationTags($reel));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::reel($reel));
        }

        foreach ($asset->videos as $video) {
            $videoTags = VideoCacheTags::invalidationTags($video);
            $backendTags = array_merge($backendTags, $videoTags);
            $frontendTags = array_merge(
                $frontendTags,
                FrontendCacheTags::fromVideoTags($videoTags),
                [FrontendCacheTags::videoDetail($video)],
            );
        }

        foreach ($asset->videoCategories as $videoCategory) {
            $backendTags = array_merge($backendTags, VideoCacheTags::categoryTags($videoCategory->locale, (string) $videoCategory->slug));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::videoCategory($videoCategory));
        }

        foreach ($asset->videoPlaylists as $playlist) {
            $playlistTags = VideoCacheTags::playlistInvalidationTags($playlist);
            $backendTags = array_merge($backendTags, $playlistTags);
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::fromVideoTags($playlistTags));
        }

        foreach ($asset->broadcasts as $broadcast) {
            $backendTags = array_merge($backendTags, BroadcastCacheTags::invalidationTags($broadcast));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::broadcast($broadcast));
        }

        foreach ($asset->broadcastCategories as $broadcastCategory) {
            $backendTags = array_merge($backendTags, BroadcastCacheTags::categoryTags((string) $broadcastCategory->slug));
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::broadcastCategoryChange());
        }

        foreach ($asset->categories as $category) {
            $backendTags[] = 'categories';
            $frontendTags = array_merge($frontendTags, FrontendCacheTags::category($category));
        }

        foreach ($asset->teamMembers as $member) {
            // لا وسم فرونت إند لأعضاء الفريق اليوم (لا مقابل في FrontendCacheTags) —
            // إبطال الكاش الخلفي فقط، مطابقةً لِما تفعله أفعال أعضاء الفريق نفسها.
            $backendTags = array_merge($backendTags, TeamMemberCacheTags::invalidationTags($member));
        }

        foreach ($asset->adCreatives as $creative) {
            // يُفوَّض بالكامل — يحسب مفاتيح المنطقة الصحيحة بنفسه (لا وسوم فرونت إند
            // للإعلانات: تُخدَم دائماً no-store من العميل، راجع تدقيق الكاش).
            AdServingInvalidator::forCreative($creative);
        }

        if ($backendTags !== []) {
            Cache::tags(array_values(array_unique($backendTags)))->flush();
        }

        if ($frontendTags !== []) {
            FrontendRevalidate::tags(array_values(array_unique($frontendTags)));
        }
    }
}

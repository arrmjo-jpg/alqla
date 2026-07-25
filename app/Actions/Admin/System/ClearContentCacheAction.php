<?php

declare(strict_types=1);

namespace App\Actions\Admin\System;

use App\Support\Cache\AdCacheTags;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Cache\BroadcastCacheTags;
use App\Support\Cache\PageCacheTags;
use App\Support\Cache\ReelCacheTags;
use App\Support\Cache\TeamMemberCacheTags;
use App\Support\Cache\VideoCacheTags;
use App\Support\Frontend\FrontendRevalidate;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * تفريغ كاش المحتوى العام بالكامل (كل الأنواع + خرائط الموقع + التصنيفات) —
 * تحكّم تشغيلي للاسترداد عند الاشتباه ببقايا قديمة (break-glass). يُفرّغ مظلّات
 * الوسوم فقط (لا يمسّ كاش النظام/الجلسات/الإعدادات)، فالعملية آمنة وقابلة
 * لإعادة البناء عند أول طلب.
 *
 * كانت هذه القائمة تغطّي المقالات/الريلز/التصنيفات فقط — إصلاح 2026-07-23:
 * أُضيفت بقية الأنواع (فيديو/بثّ/صفحات/أعضاء الفريق/إعلانات/تغطية حيّة) التي
 * كانت أداة الاسترداد اليدويّة هذه تتجاهلها، بالإضافة إلى إخطار الواجهة (Next.js
 * ISR) الذي لم يكن يحدث هنا إطلاقاً من قبل.
 *
 * يتطلّب مخزناً يدعم الوسوم (redis إنتاجاً) — وهو إلزامي أصلاً (RedisProductionCheck).
 * يُدوَّن في سجلّ التدقيق (مَن فرّغ ومتى) — حدث تشغيلي حسّاس.
 */
class ClearContentCacheAction
{
    /** مجموعات وسوم المحتوى العام القابلة للتفريغ الآمن — كل الأنواع. */
    private const TAG_GROUPS = [
        ArticleCacheTags::ALL,        // articles: feeds + details + categories
        ArticleCacheTags::SITEMAP,    // articles:sitemap
        ReelCacheTags::ALL,           // reels: feeds + details
        'categories',                 // أشجار/قوائم التصنيفات + خرائط التصنيفات
        VideoCacheTags::ALL,          // videos: feeds + details + تصنيفات + قوائم تشغيل
        VideoCacheTags::SITEMAP,      // videos:sitemap
        BroadcastCacheTags::ALL,      // broadcasts: خلاصات + تفاصيل + تصنيفاته
        BroadcastCacheTags::SITEMAP,  // broadcasts:sitemap
        PageCacheTags::ALL,           // pages: صفحات ثابتة
        TeamMemberCacheTags::ALL,     // team-members: قائمة + تفاصيل
        AdCacheTags::ALL,             // ads: مجمّع خدمة الإعلانات الخلفي
        'live_updates',                // تحديثات التغطية الحيّة
    ];

    /** وسوم الواجهة (Next.js ISR) الأوسع نطاقاً — لا سياق كيان محدَّد هنا فتُستخدَم المظلّات. */
    private const FRONTEND_TAGS = [
        'homepage', 'feed:latest', 'feed:most_read', 'feed:hero', 'feed:header',
        'feed:editors_pick', 'feed:breaking', 'categories', 'site-settings', 'search',
        'live_updates', 'comments', 'reel-feed:ar', 'reel-feed:en',
        'video-feed:ar', 'video-feed:en', 'page-feed:ar', 'page-feed:en',
        'epaper-feed:ar', 'epaper-feed:en', 'team-members:feed', 'writers',
        'broadcast-feed:live', 'broadcast-feed:tv', 'broadcast-feed:radio',
        'sport-menu',
    ];

    public function handle(): JsonResponse
    {
        $cleared = [];
        foreach (self::TAG_GROUPS as $tag) {
            try {
                Cache::tags([$tag])->flush();
                $cleared[] = $tag;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        FrontendRevalidate::tags(self::FRONTEND_TAGS);

        activity('system')
            ->event('cache_cleared')
            ->withProperties(['groups' => $cleared])
            ->log(__('system.cache_cleared'));

        return ApiResponse::success(
            data: ['cleared' => $cleared, 'at' => now()->toIso8601String()],
            meta: ['message' => __('system.cache_cleared')],
        );
    }
}

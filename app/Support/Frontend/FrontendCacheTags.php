<?php

declare(strict_types=1);

namespace App\Support\Frontend;

use App\Models\Article;
use App\Models\Broadcast;
use App\Models\Category;
use App\Models\Epaper;
use App\Models\Page;
use App\Models\Reel;
use App\Models\Video;
use App\Models\VideoCategory;

/**
 * يبني وسوم الكاش التي يجب إبطالها في الواجهة الأمامية (Next) عند كتابة محتوى.
 *
 * تطابق هذه الوسوم **حرفيّاً** وسوم fetch في الواجهة الفعليّة: frontend/src/lib/*.ts
 * (feed.ts: feed:hero/header/latest/most_read · articles.ts: article:{id} · feed.ts: category:{id}).
 * **بلا بادئة لغة** (روابط الواجهة العامّة locale-less). أي تغيير في وسوم lib يجب أن يُعكَس هنا —
 * يستقبلها POST /api/revalidate في الواجهة ويربطها بـrevalidateTag().
 *
 * قاعدة صارمة (Cache Invalidation Audit 2026-07-24): وسوم الكيان (article/category/video/reel)
 * تُبنى من الـid الثابت حصراً — أبداً من slug/name (يتغيّران بإعادة التسمية فيُفلت المحتوى القديم/الجديد
 * من الإبطال). الـid لا يتغيّر ⇒ لا حاجة لتتبّع "قديم" عند تغيّر السلَغ لهذه الوسوم.
 */
final class FrontendCacheTags
{
    /**
     * وسوم المقال: الخلاصات المتأثّرة فعلاً + صفحة المقال + تصنيفاته.
     *
     * إبطال محلّيّ (لا زائد): hero/header يُطلقان فقط إن كان المقال ضمن الكتلة (أو خرج منها
     * للتوّ — wasChanged بعد الحفظ)؛ تعديل مقال عاديّ لا يعيد بناء كتلتي الهوم هاتين.
     * latest/most_read دائمان (كلّ مقال منشور مرشّح فيهما).
     *
     * وسم صفحة المقال (article:{id}) صار مبنيّاً من id المقال حصراً (2026-07-18،
     * إصلاح جذريّ لتضارب الكاش — راجع docs/architecture/CACHE-INVALIDATION.md §11).
     * الـ id ثابت لا يتغيّر أبداً، فلا حاجة لتتبّع "قديم" كما كان الحال مع الـ slug
     * (الذي بات زخرفياً بالكامل في الرابط العامّ الجديد /news/dd/mm/yyyy/{id}/).
     *
     * @return array<int,string>
     */
    public static function article(
        Article $article,
        array $oldCategoryIds = [],
        array $oldTags = [],
        ?int $oldAuthorId = null,
    ): array {
        $tags = [
            'homepage',        // getHomepageFeed (Hero, Latest, Breaking, Editors Pick)
            'feed:latest',     // getLatestFeed (قسم /latest + الشريط الإخباري)
            'feed:most_read',  // getMostReadFeed («الأكثر قراءة» + /trending)
            "article:{$article->id}", // getArticle (صفحة تفاصيل المقال) — بالـ id فقط
            // P0 (Cache Invalidation Audit): searchArticles() تستخدم هذا الوسم لكنه لم يكن
            // يُبطَل إطلاقًا — نتيجة بحث لمقال جديد/محذوف كانت تنتظر سقف revalidate=60 فقط.
            'search',
        ];

        // 1. Editors Pick, Hero, Header transitions
        if ($article->is_featured || $article->wasChanged('is_featured')) {
            $tags[] = 'feed:hero';
        }
        if ($article->is_header || $article->wasChanged('is_header')) {
            $tags[] = 'feed:header';
        }
        if ($article->is_editor_pick || $article->wasChanged('is_editor_pick')) {
            $tags[] = 'feed:editors_pick';
        }
        // P0 (Cache Invalidation Audit): كانت feed:breaking تُستخدَم في الواجهة
        // (getBreakingFeed) بلا أي إبطال خلفي مطلقًا — لم تكن is_breaking مُعالَجة هنا إطلاقًا.
        if ($article->is_breaking || $article->wasChanged('is_breaking')) {
            $tags[] = 'feed:breaking';
        }

        // 2. Category transitions — بالـid الثابت (2026-07-24: كان بالـslug، عرضة لكسر الإبطال
        // عند إعادة تسمية القسم). $oldCategoryIds تغطّي حالة نقل المقال بين تصنيفات (لا إعادة تسمية).
        $article->loadMissing(['primaryCategory:id', 'categories:id']);
        $categoryIds = collect([$article->primaryCategory])
            ->merge($article->categories)
            ->filter()
            ->map(fn ($category): ?int => $category->id)
            ->merge($oldCategoryIds) // Append old categories (moved-away-from)!
            ->filter()
            ->unique();

        foreach ($categoryIds as $categoryId) {
            $tags[] = "category:{$categoryId}";
        }

        // 3. Author transitions
        $authorId = $article->author_id;
        if ($authorId) {
            $tags[] = "author_articles:{$authorId}";
        }
        if ($oldAuthorId !== null && $oldAuthorId !== $authorId) {
            $tags[] = "author_articles:{$oldAuthorId}";
        }

        // 4. Tag transitions
        $article->loadMissing('tags');
        $currentTags = $article->tags->pluck('name')->all();
        $allTags = collect($currentTags)->merge($oldTags)->filter()->unique();

        foreach ($allTags as $tag) {
            $tags[] = "tag:{$tag}";
        }

        return $tags;
    }

    /**
     * وسوم الصفحة الثابتة: قائمة الصفحات (فوتر/هيدر) + صفحة التفاصيل (+ سلَغ قديم عند التغيير).
     *
     * @return array<int,string>
     */
    public static function page(Page $page, ?string $oldSlug = null): array
    {
        $locale = $page->locale;
        $slug = (string) $page->slug;

        $tags = [
            "page-feed:{$locale}",
            "page:{$locale}:{$slug}",
        ];

        if ($oldSlug !== null && $oldSlug !== '' && $oldSlug !== $slug) {
            $tags[] = "page:{$locale}:{$oldSlug}";
        }

        return $tags;
    }

    /**
     * وسوم الريل: خلاصة الريلز + صفحة الريل. بالـid الثابت (2026-07-24) — لا حاجة لتتبّع سلَغ
     * قديم بعد الآن (الـid لا يتغيّر بإعادة التسمية). مستقلّة عن تصنيفات الأخبار.
     *
     * @return array<int,string>
     */
    public static function reel(Reel $reel): array
    {
        return [
            "reel-feed:{$reel->locale}",
            "reel:{$reel->id}",
        ];
    }

    /**
     * وسوم التصنيف: شجرة الأقسام (categories — تستهلكها بلوكات الهوم عبر getCategoryById)
     * + تنقّل الهيدر (site-settings — nav_categories ضمن /site) + قائمة/صفحة القسم بالـid
     * الثابت (2026-07-24). الـid لا يتغيّر بإعادة تسمية السلَغ ⇒ لا حاجة لتتبّع "قديم" ولا
     * لمظلّة `articles` بعد الآن (كانتا ضروريّتين فقط حين كان الوسم slug-based).
     *
     * @return array<int,string>
     */
    public static function category(Category $category): array
    {
        return ['categories', 'site-settings', "category:{$category->id}"];
    }

    /**
     * وسوم تعليقات مقال — يطلقها الإشراف (الاعتماد/الرفض/الحذف يغيّر القائمة العامّة؛
     * الإنشاء العامّ pending فلا يُبطل شيئاً).
     *
     * @return array<int,string>
     */
    public static function comments(string $articleSlug): array
    {
        return ['comments', "comments:{$articleSlug}"];
    }

    /**
     * وسوم التغطية المباشرة لمقال — يُبطلها إنشاء/تعديل/حذف/نقل أي تحديث خط (P0 Cache
     * Invalidation Audit: كانت هذه العمليات تُفرِّغ Cache::tags(['live_updates']) الخلفي
     * فقط دون إخطار الواجهة، فتبقى صفحة "مباشر" على حالها حتى انقضاء revalidate=1800).
     *
     * @return array<int,string>
     */
    public static function liveUpdates(Article $article): array
    {
        return ['live_updates', "live:{$article->slug}"];
    }

    /**
     * وسوم البثّ — تُبنى مباشرة (وليس بالترجمة من BroadcastCacheTags الخلفي، الذي لا
     * يُضمِّن kind في وسم التفاصيل بينما الواجهة تحتاجه: lib/broadcast.ts يستهلك
     * broadcast:{kind}:{slug} — ترجمة ساذجة كانت ستُنتج سلسلة لا تطابق شيئًا).
     *
     * @return array<int,string>
     */
    public static function broadcast(Broadcast $broadcast, ?string $oldKind = null, ?string $oldSlug = null): array
    {
        $kind = $broadcast->kind->value;
        $slug = (string) $broadcast->slug;

        $tags = ["broadcast-feed:{$kind}", "broadcast:{$kind}:{$slug}"];

        if ($oldKind !== null && $oldKind !== $kind) {
            $tags[] = "broadcast-feed:{$oldKind}";
        }
        if ($oldSlug !== null && $oldSlug !== '' && $oldSlug !== $slug) {
            $tags[] = 'broadcast:'.($oldKind ?? $kind).":{$oldSlug}";
        }

        return $tags;
    }

    /**
     * وسوم كل خلاصات البثّ الثلاث — تُستخدَم عند تغيير تصنيف بثّ (لا وسم فرونت إند
     * خاصّ بتصنيف البثّ اليوم، خلافًا للفيديو؛ التصنيفات تُعرَض ضمن نفس خلاصات الأنواع).
     *
     * @return array<int,string>
     */
    public static function broadcastCategoryChange(): array
    {
        return array_map(fn (string $kind): string => "broadcast-feed:{$kind}", \App\Enums\BroadcastKind::values());
    }

    /**
     * وسم خلاصة الجريدة الرقمية — الواجهة (lib/epaper.ts) لا تملك وسم تفاصيل عدد
     * منفصل؛ صفحة القارئ نفسها تقرأ من نفس getEpapers() المُوسَّم بهذا فقط.
     *
     * @return array<int,string>
     */
    public static function epaper(Epaper $epaper, ?string $oldLocale = null): array
    {
        $tags = ["epaper-feed:{$epaper->locale}"];

        if ($oldLocale !== null && $oldLocale !== $epaper->locale) {
            $tags[] = "epaper-feed:{$oldLocale}";
        }

        return $tags;
    }

    /**
     * يترجم وسوم كاش الفيديو الخلفية (VideoCacheTags) إلى وسوم الواجهة المقابلة. يُستفاد
     * من أن أفعال الفيديو/قائمة التشغيل تحسب أصلاً مجموعة الإبطال الصحيحة (شاملةً القديم
     * عند تغيّر slug/locale)، فنترجمها بدل إعادة اشتقاقها:
     *
     *   videos:feed:{L}            → video-feed:{L}        (مكتبة + مميّز + رائج + ذو صلة + قوائم)
     *   videos:category:{L}:{slug} → video-category:{L}:{slug}
     *   videos:playlist:{L}:{slug} → playlist:{L}:{slug}   (صفحة قائمة التشغيل)
     *
     * تُهمَل المظلّة (videos) ووسم الخرائط (videos:sitemap) — لا مقابل لهما في الواجهة.
     *
     * ملاحظة (2026-07-24، Cache Invalidation Audit): `videos:detail:{L}:{slug}` **لم يعد**
     * يُترجَم هنا — كان يُنتج وسم واجهة slug-based (`video:{L}:{slug}`) يخالف قاعدة الـid
     * الثابتة. صفحة تفاصيل الفيديو تُبطَل الآن حصراً عبر {@see videoDetail()} المُستدعاة
     * صراحةً من كل Action يملك كائن Video (Create/Update/Delete/ForceDelete/Restore/
     * PublishDue/BulkVideoAction/RevalidateVideoFrontendOnStatusChanged).
     *
     * @param  array<int,string>  $backendTags
     * @return array<int,string>
     */
    public static function fromVideoTags(array $backendTags): array
    {
        $map = [
            'videos:feed:' => 'video-feed:',
            'videos:category:' => 'video-category:',
            'videos:playlist:' => 'playlist:',
        ];

        $out = [];
        foreach ($backendTags as $tag) {
            foreach ($map as $prefix => $frontPrefix) {
                if (str_starts_with($tag, $prefix)) {
                    $out[] = $frontPrefix.substr($tag, strlen($prefix));

                    break;
                }
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * وسم صفحة تفاصيل الفيديو — بالـid الثابت (مطابق لِـarticle/category/reel). يُستدعى
     * صراحةً (بدل الترجمة من VideoCacheTags، الذي يبقى slug-based داخليًّا لكاش Laravel
     * نفسه) من كل Action يملك كائن Video عند إنشاء/تعديل/حذف/نشر فيديو.
     */
    public static function videoDetail(Video $video): string
    {
        return "video:{$video->id}";
    }

    /**
     * وسوم تصنيف الفيديو — صفحة /video-categories/{slug} + خلاصة اللغة (أسماء التصنيفات
     * تظهر على البطاقات). تُستخدَم حين يُفرَّغ التصنيف بالمظلّة العامة (لا يمرّ بالمترجِم).
     *
     * @return array<int,string>
     */
    public static function videoCategory(VideoCategory $category): array
    {
        $locale = $category->locale;

        return [
            "video-feed:{$locale}",
            'video-category:'.$locale.':'.(string) $category->slug,
        ];
    }
}

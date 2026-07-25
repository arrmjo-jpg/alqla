<?php

declare(strict_types=1);

namespace App\Actions\Public\Content;

use App\Http\Resources\Public\Content\PublicCategoryResource;
use App\Models\Category;
use App\Support\Cache\CacheKeys;
use App\Support\Cache\CacheTtl;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * تفاصيل تصنيف فعّال للقراءة العامة — يقبل إمّا id مجرَّد (المسار القانونيّ
 * الجديد /category-{id}/{slug}، راجع Category::canonicalPath()) أو (locale +
 * مسار متداخل بالـ slug، توافقاً مع أي مستهلك لا يزال يمرِّر سلسلة slugs).
 * الأبناء مُحمَّلون للاستهلاك في صفحات التنقّل الفرعي.
 *
 * إعادة تصميم (2026-07-23): id هو المُطابِق الأساسيّ الآن (مرآة
 * ShowPublicArticleAction::resolveId) — لا يتأثّر بتغيّر الاسم/الـslug إطلاقاً؛
 * سلسلة الـslug تبقى مدعومة (لا تُحذف) لأي رابط قديم لم يُعَد بعد.
 */
class ShowPublicCategoryAction
{
    public function handle(string $locale, string $path): JsonResponse
    {
        if (! in_array($locale, Category::LOCALES, true)) {
            return ApiResponse::error(__('article.invalid_locale'), [], 422);
        }

        $trimmed = trim($path, '/');
        if ($trimmed !== '' && ctype_digit($trimmed)) {
            return $this->handleById($locale, (int) $trimmed);
        }

        $segments = array_values(array_filter(explode('/', $trimmed), fn (string $s): bool => $s !== ''));
        if ($segments === [] || count($segments) > Category::MAX_DEPTH) {
            return ApiResponse::error(__('category.not_found'), [], 404);
        }

        $payload = Cache::tags(['categories'])->remember(
            CacheKeys::publicCategoryDetail($locale, implode('/', $segments)),
            CacheTtl::METADATA,
            function () use ($locale, $segments): ?array {
                $category = $this->resolveChain($locale, $segments);
                if ($category === null) {
                    return null;
                }

                return (new PublicCategoryResource($category))->resolve();
            }
        );

        if ($payload === null) {
            return ApiResponse::error(__('category.not_found'), [], 404);
        }

        return ApiResponse::success(data: $payload);
    }

    /** المطابقة الأساسيّة الجديدة: id مباشر، ثابت بصرف النظر عن تغيّر الاسم. */
    private function handleById(string $locale, int $id): JsonResponse
    {
        $payload = Cache::tags(['categories'])->remember(
            CacheKeys::publicCategoryDetail($locale, (string) $id),
            CacheTtl::METADATA,
            function () use ($locale, $id): ?array {
                $category = Category::query()
                    ->active()
                    ->forLocale($locale)
                    ->with(['children' => $this->childrenLoader(), 'bannerMedia'])
                    ->find($id);

                if ($category === null) {
                    return null;
                }

                return (new PublicCategoryResource($category))->resolve();
            }
        );

        if ($payload === null) {
            return ApiResponse::error(__('category.not_found'), [], 404);
        }

        return ApiResponse::success(data: $payload);
    }

    /**
     * يمشي سلسلة المقاطع من الجذر نزولاً — كل مقطع لاحق يجب أن يكون ابناً
     * مباشراً لسابقه. أي انقطاع (مقطع لا يطابق ابناً) ⇒ null (404) فوراً،
     * بلا تراجع لمطابقة جزئية.
     *
     * @param  array<int,string>  $segments
     */
    private function resolveChain(string $locale, array $segments): ?Category
    {
        $withChildren = $this->childrenLoader();

        $current = Category::query()
            ->active()
            ->forLocale($locale)
            ->whereNull('parent_id')
            ->where('slug', $segments[0])
            ->with(['children' => $withChildren, 'bannerMedia'])
            ->first();

        if ($current === null) {
            return null;
        }

        for ($i = 1; $i < count($segments); $i++) {
            $current = Category::query()
                ->active()
                ->forLocale($locale)
                ->where('parent_id', $current->id)
                ->where('slug', $segments[$i])
                ->with(['children' => $withChildren, 'bannerMedia'])
                ->first();

            if ($current === null) {
                return null;
            }
        }

        return $current;
    }

    /** @return \Closure(\Illuminate\Database\Eloquent\Builder):void */
    private function childrenLoader(): \Closure
    {
        return fn ($q) => $q->where('status', 'active')
            ->orderBy('sort_order')
            ->with('bannerMedia');
    }
}

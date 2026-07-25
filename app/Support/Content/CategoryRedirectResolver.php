<?php

declare(strict_types=1);

namespace App\Support\Content;

use App\Models\Category;
use App\Models\CategoryUrlHistory;

/**
 * مُحلِّل إعادة التوجيه 301 للتصنيفات (SEO / منع كسر الروابط عند تغيير الاسم):
 * يربط مساراً قانونياً قديماً بالتصنيف الحالي. مصدر الحقيقة: category_url_history
 * (يلتقطه UpdateCategoryAction عند تغيّر المسار القانوني — slug و/أو locale).
 *
 * منع الحلقات: لا يُعاد التوجيه إن كان الهدف مطابقاً للمطلوب. البحث مفهرس على
 * (locale, old_path) — مرآة ArticleRedirectResolver::resolveByPath(). لا حاجة
 * لمقابل resolveBySlug() هنا: لا يوجد مسار عامّ بمجرَّد slug للتصنيفات (خلافاً
 * للمقالات) — المسار الوحيد /categories/{path} يتوقّع سلسلة slugs أو id مجرَّد.
 */
final class CategoryRedirectResolver
{
    public static function resolveByPath(string $locale, string $oldPath): ?Category
    {
        if (! in_array($locale, Category::LOCALES, true)) {
            return null;
        }

        $oldPath = '/'.trim($oldPath, '/');

        $row = CategoryUrlHistory::query()
            ->where('locale', $locale)
            ->where('old_path', $oldPath)
            ->latest('id')
            ->first();

        if ($row === null) {
            return null;
        }

        $category = Category::query()->active()->whereKey($row->category_id)->first();
        if ($category === null) {
            return null;
        }

        // منع الحلقة: الهدف نفسه المسار المطلوب.
        return $category->canonicalPath() === $oldPath ? null : $category;
    }
}

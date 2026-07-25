<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public\Content;

use App\Actions\Public\Content\ListPublicCategoriesAction;
use App\Actions\Public\Content\ShowPublicCategoryAction;
use App\Http\Controllers\Controller;
use App\Support\Content\CategoryRedirectResolver;
use App\Support\Content\PublicSeoBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(string $locale): JsonResponse
    {
        return (new ListPublicCategoriesAction)->handle($locale);
    }

    /** $path: id مجرَّد، أو مقطع slug مفرد، أو سلسلة مقاطع متداخلة مفصولة بـ«/» (2026-07-18). */
    public function show(string $locale, string $path): JsonResponse
    {
        return (new ShowPublicCategoryAction)->handle($locale, $path);
    }

    /**
     * مُحلِّل إعادة التوجيه 301 (SEO/تغيير اسم): يستقبل مساراً قانونياً قديماً كاملاً
     * (?path=/category-{id}/{old-slug}) ويُعيد 301 إلى الـ canonical الحالي. مرآة
     * ArticleController::redirect().
     */
    public function redirect(Request $request, string $locale): JsonResponse
    {
        $path = (string) $request->query('path', '');

        $target = $path !== ''
            ? CategoryRedirectResolver::resolveByPath($locale, $path)
            : null;

        if ($target === null) {
            return response()->json(['message' => __('category.not_found')], 404);
        }

        $location = PublicSeoBuilder::absoluteUrl($target->canonicalPath());

        return new JsonResponse(['redirect' => $location], 301, ['Location' => $location]);
    }
}

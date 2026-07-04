<?php

declare(strict_types=1);

namespace App\Actions\Public\Content;

use App\Enums\ArticleType;
use App\Http\Resources\Public\Content\PublicArticleListItemResource;
use App\Models\Article;
use App\Models\Category;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Cache\CachedRead;
use App\Support\Cache\CacheKeys;
use App\Support\Cache\CacheTtl;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * قائمة المقالات المنشورة (قراءة عامة) — مرشّحات allow-list فقط.
 *
 * - locale يأتي من بادئة المسار {locale}؛ يُتحقَّق منه قبل أي استعلام.
 * - الفلاتر المسموحة: type, category (slug), tag (name), q (بحث في العنوان).
 * - ترتيب افتراضي: -published_at؛ سماح: -published_at, published_at, -views_count.
 * - الكاش مفعّل عبر tag «articles» — يُفرَّغ من إجراءات الإدارة (Wave C2 امتداد).
 * - مفتاح الكاش يحوي query-hash مستقرّاً (لا يعتمد ترتيب المفاتيح).
 */
class ListPublicArticlesAction
{
    public function handle(string $locale, Request $request): JsonResponse
    {
        if (! in_array($locale, Article::LOCALES, true)) {
            return ApiResponse::error(__('article.invalid_locale'), [], 422);
        }

        $default = (int) config('performance.pagination.default');
        $max = (int) config('performance.pagination.max');
        $perPage = max(1, min((int) $request->integer('per_page', $default), $max));
        $page = max(1, (int) $request->integer('page', 1));

        // وضع cursor (للجوّال/التمرير العميق): ثابت وسريع بلا COUNT ولا إزاحة عناصر.
        $cursorMode = $request->query('paginate') === 'cursor';

        $queryHash = $this->hashQuery($request, $perPage, $page);

        // إبطال حبيبي: قائمة مفلترة بتصنيف تُوسَم بوسم ذلك التصنيف (تُبطَل عند تغيّر
        // مقالاته فقط)؛ القوائم العامة تُوسَم feed(locale).
        $categoryFilter = (string) ($request->query('filter')['category'] ?? '');
        $tags = $categoryFilter !== ''
            ? ArticleCacheTags::categoryTags($locale, $categoryFilter)
            : ArticleCacheTags::feedTags($locale);

        $payload = CachedRead::remember(
            $tags,
            CacheKeys::publicArticlesList($locale, $queryHash),
            CacheTtl::SHORT,
            fn (): array => $this->build($locale, $request, $perPage, $cursorMode)
        );

        return ApiResponse::success(
            data: $payload['data'],
            meta: $cursorMode ? ['cursor' => $payload['cursor']] : ['pagination' => $payload['pagination']]
        );
    }

    /** @return array<string,mixed> */
    private function build(string $locale, Request $request, int $perPage, bool $cursorMode): array
    {
        $term = trim((string) ($request->query('filter')['q'] ?? ''));

        // إذا كان هناك نص بحث، نستخدم Meilisearch ونمطه الأصلي في الترقيم والفرز بالصلة
        if ($term !== '' && ! $cursorMode) {
            try {
                $search = Article::search($term)
                    ->where('status', \App\Enums\ArticleStatus::Published->value)
                    ->where('locale', $locale);

                // تطبيق مرشحات التصفية الخاصة بالبحث العام داخل Meilisearch (فقط إذا لم يكن محرك المجموعات المحاكي للتوافق مع الاختبارات)
                $isCollection = config('scout.driver') === 'collection';
                $categoryFilter = (string) ($request->query('filter')['category'] ?? '');
                if ($categoryFilter !== '') {
                    $category = Category::where('slug', $categoryFilter)->where('locale', $locale)->first();
                    if ($category) {
                        if (! $isCollection) {
                            $search->where('category_ids', $category->id);
                        }
                    } else {
                        if (! $isCollection) {
                            $search->where('category_ids', -1);
                        }
                    }
                }

                $tagFilter = (string) ($request->query('filter')['tag'] ?? '');
                if ($tagFilter !== '' && ! $isCollection) {
                    $search->where('tag_names', $tagFilter);
                }

                $typeFilter = (string) ($request->query('filter')['type'] ?? '');
                if ($typeFilter !== '' && ! $isCollection) {
                    $search->where('type', $typeFilter);
                }

                // الحماية المزدوجة (Double Security): نقيد تحميل النماذج بقوانين النشر وسرية البيانات والأقسام من MySQL
                $search->query(fn ($q) => $q->published()
                    ->forLocale($locale)
                    ->select([
                        'id', 'author_id', 'primary_category_id', 'type', 'status', 'locale',
                        'title', 'slug', 'excerpt', 'published_at', 'is_pinned', 'views_count'
                    ])
                    ->with([
                        'author:id,name,avatar,is_writer',
                        'primaryCategory:id,name,slug',
                        'mediaAssets' => fn ($ma) => $ma->wherePivot('collection', 'cover')
                    ])
                    ->when($categoryFilter !== '', function ($q) use ($categoryFilter, $locale) {
                        $category = Category::where('slug', $categoryFilter)->where('locale', $locale)->first();
                        if ($category) {
                            $q->where(function ($w) use ($category) {
                                $w->where('primary_category_id', $category->id)
                                  ->orWhereHas('categories', fn ($sub) => $sub->where('categories.id', $category->id));
                            });
                        } else {
                            $q->whereRaw('1 = 0');
                        }
                    })
                    ->when($tagFilter !== '', function ($q) use ($tagFilter) {
                        $q->withAnyTags([$tagFilter]);
                    })
                    ->when($typeFilter !== '', function ($q) use ($typeFilter) {
                        $q->where('type', $typeFilter);
                    })
                );

                $paginator = $search->paginate($perPage)->appends($request->query());

                return [
                    'data' => PublicArticleListItemResource::collection($paginator)->resolve(),
                    'pagination' => [
                        'total' => $paginator->total(),
                        'count' => $paginator->count(),
                        'per_page' => $paginator->perPage(),
                        'current_page' => $paginator->currentPage(),
                        'total_pages' => $paginator->lastPage(),
                    ],
                ];
            } catch (\Throwable $e) {
                // تدهور رشيق: نرجع للبحث عبر قاعدة البيانات مباشرة في حال تعطل محرك البحث
                report($e);
            }
        }

        // المسار الافتراضي بدون بحث (أو كحالة تراجع في حال تعطل Meilisearch)
        $query = QueryBuilder::for(
            Article::query()
                ->select([
                    'id', 'author_id', 'primary_category_id', 'type', 'status', 'locale',
                    'title', 'subtitle', 'slug', 'excerpt', 'published_at',
                    'is_featured', 'is_breaking', 'is_pinned', 'is_header', 'is_editor_pick', 'is_squares',
                    'views_count', 'event_status', 'created_at', 'deleted_at'
                ])
                ->published()
                ->forLocale($locale)
                ->with([
                    'author:id,name,avatar,is_writer',
                    'primaryCategory:id,name,slug',
                    'mediaAssets' => fn ($q) => $q->wherePivot('collection', 'cover')
                ])
        )
            ->allowedFilters(
                AllowedFilter::exact('type'),
                AllowedFilter::partial('title', 'title'),
                // تصفية البحث التقليدي في قاعدة البيانات (Fallback)
                AllowedFilter::callback('q', function ($q) use ($term): void {
                    if ($term === '') {
                        return;
                    }
                    if (\Illuminate\Support\Facades\DB::connection()->getDriverName() === 'mysql') {
                        $q->whereFullText('title', $term);
                    } else {
                        $q->where('title', 'like', '%'.$term.'%');
                    }
                }),
                AllowedFilter::callback('category', function ($q, $value) use ($locale): void {
                    $category = Category::query()
                        ->where('slug', (string) $value)
                        ->where('locale', $locale)
                        ->first();
                    if ($category === null) {
                        $q->whereRaw('1 = 0');
                        return;
                    }
                    $q->where(function ($w) use ($category): void {
                        $w->where('primary_category_id', $category->id)
                            ->orWhereHas(
                                'categories',
                                fn ($sub) => $sub->where('categories.id', $category->id)
                            );
                    });
                }),
                AllowedFilter::callback('tag', function ($q, $value): void {
                    $q->withAnyTags([(string) $value]);
                }),
            );

        if ($cursorMode) {
            $paginator = $query
                ->orderByDesc('is_pinned')
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->cursorPaginate($perPage)
                ->withQueryString();

            return [
                'data' => PublicArticleListItemResource::collection($paginator)->resolve(),
                'cursor' => [
                    'per_page' => $paginator->perPage(),
                    'next_cursor' => $paginator->nextCursor()?->encode(),
                    'prev_cursor' => $paginator->previousCursor()?->encode(),
                    'has_more' => $paginator->hasMorePages(),
                ],
            ];
        }

        // Optimize COUNT(*) by caching it separately under query filters tags
        $categoryFilter = (string) ($request->query('filter')['category'] ?? '');
        $tags = $categoryFilter !== ''
            ? ArticleCacheTags::categoryTags($locale, $categoryFilter)
            : ArticleCacheTags::feedTags($locale);

        $relevantFilters = [
            'filter.type' => (string) ($request->query('filter')['type'] ?? ''),
            'filter.category' => $categoryFilter,
            'filter.tag' => (string) ($request->query('filter')['tag'] ?? ''),
            'filter.q' => $term,
        ];
        ksort($relevantFilters);
        $filterHash = substr(hash('xxh128', json_encode($relevantFilters)), 0, 16);
        $countCacheKey = "public:articles:count:{$locale}:{$filterHash}";

        // Retrieve total count using cached tags (warmed up or computed)
        $total = CachedRead::remember(
            $tags,
            $countCacheKey,
            CacheTtl::SHORT,
            fn () => $query->toBase()->getCountForPagination()
        );

        $page = max(1, (int) $request->integer('page', 1));
        
        $results = $query
            ->orderByDesc('is_pinned')
            ->allowedSorts('published_at', 'views_count')
            ->defaultSort('-published_at')
            ->forPage($page, $perPage)
            ->get();

        $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
            $results,
            $total,
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        return [
            'data' => PublicArticleListItemResource::collection($paginator)->resolve(),
            'pagination' => [
                'total' => $paginator->total(),
                'count' => $paginator->count(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'total_pages' => $paginator->lastPage(),
            ],
        ];
    }

    /** هاش مستقرّ لعبور الكاش — يستثني المفاتيح غير المؤثرة. */
    private function hashQuery(Request $request, int $perPage, int $page): string
    {
        $relevant = [
            'page' => $page,
            'per_page' => $perPage,
            'paginate' => (string) $request->query('paginate', ''),
            'cursor' => (string) $request->query('cursor', ''),
            'sort' => (string) $request->query('sort', ''),
            'filter.type' => (string) ($request->query('filter')['type'] ?? ''),
            'filter.category' => (string) ($request->query('filter')['category'] ?? ''),
            'filter.tag' => (string) ($request->query('filter')['tag'] ?? ''),
            'filter.q' => (string) ($request->query('filter')['q'] ?? ''),
        ];
        ksort($relevant);

        return substr(hash('xxh128', json_encode($relevant, JSON_THROW_ON_ERROR)), 0, 16);
    }

    /** @return array<int,string> */
    public static function allowedTypes(): array
    {
        return ArticleType::values();
    }
}

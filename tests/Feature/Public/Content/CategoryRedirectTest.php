<?php

declare(strict_types=1);

use App\Models\Category;
use App\Models\CategoryUrlHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Cache::flush();
});

function rdCategory(string $slug, string $locale = 'ar', array $attrs = []): Category
{
    return Category::create(array_merge([
        'name' => 'name-'.uniqid(),
        'slug' => $slug,
        'locale' => $locale,
        'status' => 'active',
    ], $attrs))->fresh();
}

// ─── Slug change → 301 via the dedicated redirect endpoint ─────────────────

it('301-redirects an old category path to the current canonical path', function (): void {
    $category = rdCategory('new-slug');
    $oldPath = "/category-{$category->id}/old-slug";
    CategoryUrlHistory::create([
        'category_id' => $category->id,
        'locale' => 'ar',
        'old_path' => $oldPath,
        'reason' => 'canonical_change',
    ]);

    $res = $this->getJson('/api/v1/ar/redirects/categories?path='.urlencode($oldPath));

    $res->assertStatus(301);
    expect($res->headers->get('Location'))->toContain($category->fresh()->canonicalPath());
});

it('301-redirects across a locale change to the current locale', function (): void {
    $category = rdCategory('moved-slug', 'en');
    $oldPath = "/category-{$category->id}/old-arabic";
    CategoryUrlHistory::create([
        'category_id' => $category->id,
        'locale' => 'ar', // كان عربياً، أصبح إنجليزياً
        'old_path' => $oldPath,
        'reason' => 'canonical_change',
    ]);

    $res = $this->getJson('/api/v1/ar/redirects/categories?path='.urlencode($oldPath));

    $res->assertStatus(301);
    expect($res->headers->get('Location'))->toContain($category->fresh()->canonicalPath());
});

// ─── No history / loop safety ───────────────────────────────────────────────

it('returns 404 (no redirect) for an unmapped path', function (): void {
    $this->getJson('/api/v1/ar/redirects/categories?path=/category-999/nope')->assertStatus(404);
});

it('does not redirect when the mapped target already matches the requested path (loop guard)', function (): void {
    $category = rdCategory('current-slug');
    $currentPath = $category->canonicalPath();
    // سطر تاريخي يشير إلى نفس المسار الحالي (بيانات فاسدة/سباق) — يجب ألّا يُعيد توجيهاً.
    CategoryUrlHistory::create([
        'category_id' => $category->id,
        'locale' => 'ar',
        'old_path' => $currentPath,
        'reason' => 'canonical_change',
    ]);

    $this->getJson('/api/v1/ar/redirects/categories?path='.urlencode($currentPath))->assertStatus(404);
});

// ─── Id-based public lookup is rename-safe ──────────────────────────────────

it('serves a category by bare id regardless of slug renames', function (): void {
    $category = rdCategory('original-slug');

    $this->getJson("/api/v1/ar/categories/{$category->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $category->id)
        ->assertJsonPath('data.canonical_path', $category->canonicalPath());

    // عبر الأكشن الحقيقي (لا حفظ خام) — هو من يُفرِّغ وسم 'categories'، مطابقاً
    // لما يحدث فعلياً في الإنتاج عند إعادة تسمية تصنيف من لوحة الإدارة.
    (new App\Actions\Admin\Content\UpdateCategoryAction)->handle($category, ['slug' => 'renamed-slug']);

    $this->getJson("/api/v1/ar/categories/{$category->id}")
        ->assertOk()
        ->assertJsonPath('data.slug', 'renamed-slug');
});

it('still serves the current category via slug-chain lookup (backward compatible)', function (): void {
    $category = rdCategory('live-slug');

    $this->getJson('/api/v1/ar/categories/live-slug')
        ->assertOk()
        ->assertJsonPath('data.id', $category->id);
});

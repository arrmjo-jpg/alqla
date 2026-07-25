<?php

declare(strict_types=1);

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeCanonicalCategory(array $attrs = []): Category
{
    return Category::create(array_merge([
        'name' => 'تصنيف '.uniqid(),
        'locale' => 'ar',
        'status' => 'active',
    ], $attrs));
}

it('builds the id-based canonical path, independent of ancestry', function (): void {
    $root = makeCanonicalCategory(['name' => 'رياضة']);
    $child = makeCanonicalCategory(['name' => 'كرة قدم', 'parent_id' => $root->id]);
    $leaf = makeCanonicalCategory(['name' => 'الدوري الإنجليزي', 'parent_id' => $child->id]);

    expect($leaf->canonicalPath())->toBe("/category-{$leaf->id}/{$leaf->slug}");
    expect($root->canonicalPath())->toBe("/category-{$root->id}/{$root->slug}");
    // لا سلسلة آباء في المسار — تغيير اسم/سلَغ الأب لا يمسّ مسار الابن إطلاقاً.
    expect($leaf->canonicalPath())->not->toContain($root->slug);
});

it('keeps the canonical path stable when the slug is renamed but the id is unchanged', function (): void {
    $category = makeCanonicalCategory(['name' => 'اقتصاد']);
    $oldPath = $category->canonicalPath();

    $category->slug = 'renamed-slug';
    $category->save();

    expect($category->canonicalPath())->not->toBe($oldPath);
    expect($category->canonicalPath())->toBe("/category-{$category->id}/renamed-slug");
});

it('allows two categories to share the same slug under different parents', function (): void {
    $parentA = makeCanonicalCategory(['name' => 'أب أ']);
    $parentB = makeCanonicalCategory(['name' => 'أب ب']);

    $childA = makeCanonicalCategory(['name' => 'تقنية', 'parent_id' => $parentA->id]);
    $childB = makeCanonicalCategory(['name' => 'تقنية', 'parent_id' => $parentB->id]);

    // القيد الجديد (locale, parent_id, slug) يسمح بهذا التطابق — كان مرفوضًا تحت القيد
    // القديم (locale, slug) فقط، الذي كان يفرض عدم التكرار بصرف النظر عن الأب.
    expect($childA->slug)->toBe($childB->slug);
    expect($childA->canonicalPath())->not->toBe($childB->canonicalPath());
});

it('still auto-suffixes the slug when two categories under the SAME parent would collide', function (): void {
    $parent = makeCanonicalCategory(['name' => 'أب واحد']);

    $first = makeCanonicalCategory(['name' => 'تقنية', 'parent_id' => $parent->id]);
    $second = makeCanonicalCategory(['name' => 'تقنية', 'parent_id' => $parent->id]);

    expect($first->slug)->not->toBe($second->slug);
});

it('treats two root categories (parent_id null) as their own uniqueness group', function (): void {
    $rootA = makeCanonicalCategory(['name' => 'جذر أ']);
    $rootB = makeCanonicalCategory(['name' => 'جذر أ']); // نفس الاسم، بلا أب لكليهما

    // يُتوقَّع تفرّد التطبيق (scopeWithUniqueSlugConstraints) أن يُلاحقهما كمجموعة واحدة
    // (كلاهما parent_id === null)، تمامًا كسلوك القيد القديم بين الجذور.
    expect($rootA->slug)->not->toBe($rootB->slug);
});

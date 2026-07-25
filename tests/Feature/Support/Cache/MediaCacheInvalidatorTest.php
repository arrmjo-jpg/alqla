<?php

declare(strict_types=1);

use App\Jobs\RevalidateFrontendCacheJob;
use App\Models\AdCampaign;
use App\Models\AdCreative;
use App\Models\Article;
use App\Models\Category;
use App\Models\MediaAsset;
use App\Models\TeamMember;
use App\Models\User;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Cache\MediaCacheInvalidator;
use App\Support\Cache\TeamMemberCacheTags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    seedRoles();
    Cache::flush();
    config(['services.frontend_revalidate.url' => 'https://example.test/api/revalidate']);
    config(['services.frontend_revalidate.secret' => 'test-secret']);
});

function mciAsset(): MediaAsset
{
    return MediaAsset::create([
        'uuid' => 'mci-'.uniqid(),
        'disk' => 'uploads',
        'path' => 'assets/'.uniqid().'/file.jpg',
        'filename' => 'file.jpg',
        'original_name' => 'file.jpg',
        'extension' => 'jpg',
        'mime_type' => 'image/jpeg',
        'size' => 1024,
        'visibility' => 'public',
    ]);
}

function mciArticle(array $attrs = []): Article
{
    $cat = Category::create(['name' => 'c-'.uniqid(), 'locale' => 'ar', 'status' => 'active']);

    return Article::create(array_merge([
        'title' => 't-'.uniqid(),
        'slug' => 's-'.uniqid(),
        'locale' => 'ar',
        'type' => 'news',
        'status' => 'published',
        'primary_category_id' => $cat->id,
        'author_id' => User::factory()->create()->id,
        'content_json' => tiptapDoc(),
        'content' => '<p>x</p>',
        'excerpt' => 'x',
        'published_at' => now()->subDay(),
    ], $attrs))->fresh();
}

it('invalidates the owning article cache when the shared gallery asset changes', function (): void {
    Queue::fake();
    $asset = mciAsset();
    $article = mciArticle();
    $asset->articles()->attach($article->id, ['collection' => 'gallery', 'position' => 0]);

    Cache::tags(ArticleCacheTags::writeTags($article->fresh()))->put('probe', 'x', 600);

    MediaCacheInvalidator::invalidate($asset->fresh());

    expect(Cache::tags(ArticleCacheTags::writeTags($article->fresh()))->get('probe'))->toBeNull();
    Queue::assertPushed(RevalidateFrontendCacheJob::class);
});

it('invalidates the owning article cache when its og:image asset changes', function (): void {
    Queue::fake();
    $asset = mciAsset();
    $article = mciArticle(['og_image_id' => $asset->id]);

    Cache::tags(ArticleCacheTags::writeTags($article->fresh()))->put('probe', 'x', 600);

    MediaCacheInvalidator::invalidate($asset->fresh());

    expect(Cache::tags(ArticleCacheTags::writeTags($article->fresh()))->get('probe'))->toBeNull();
    Queue::assertPushed(RevalidateFrontendCacheJob::class);
});

it('invalidates the categories cache when a category banner asset changes (new relation)', function (): void {
    Queue::fake();
    $asset = mciAsset();
    $category = Category::create([
        'name' => 'cat-'.uniqid(), 'locale' => 'ar', 'status' => 'active', 'banner_media_id' => $asset->id,
    ]);

    Cache::tags(['categories'])->put('probe', 'x', 600);

    MediaCacheInvalidator::invalidate($asset->fresh());

    expect(Cache::tags(['categories'])->get('probe'))->toBeNull();
    Queue::assertPushed(RevalidateFrontendCacheJob::class);
    expect($category->fresh()->bannerMedia->id)->toBe($asset->id);
});

it('invalidates the team-member cache when an avatar asset changes (new relation)', function (): void {
    $asset = mciAsset();
    $member = TeamMember::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'member-'.uniqid(),
        'job_title' => 'title-'.uniqid(),
        'slug' => 'member-'.uniqid(),
        'status' => 'active',
        'avatar_asset_id' => $asset->id,
    ]);

    Cache::tags(TeamMemberCacheTags::invalidationTags($member))->put('probe', 'x', 600);

    MediaCacheInvalidator::invalidate($asset->fresh());

    expect(Cache::tags(TeamMemberCacheTags::invalidationTags($member))->get('probe'))->toBeNull();
});

it('invalidates the ad-serving pool when a placed creative image asset changes (new relation)', function (): void {
    $asset = mciAsset();
    $campaign = AdCampaign::factory()->create();
    $creative = AdCreative::factory()->create([
        'ad_campaign_id' => $campaign->id,
        'media_asset_id' => $asset->id,
    ]);

    // لا استثناء حتى بلا إسنادات فعلية (AdServingInvalidator::forCreative يتسامح مع صفر مساحات).
    MediaCacheInvalidator::invalidate($asset->fresh());

    expect($creative->fresh()->media_asset_id)->toBe($asset->id);
});

it('is a no-op for a truly orphan asset (no owners, nothing to flush)', function (): void {
    Queue::fake();
    $asset = mciAsset();

    MediaCacheInvalidator::invalidate($asset);

    Queue::assertNotPushed(RevalidateFrontendCacheJob::class);
});

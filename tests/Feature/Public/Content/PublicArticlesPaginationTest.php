<?php

use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createTestCategory($slug) {
    return Category::create(['locale' => 'ar', 'name' => json_encode(['ar' => $slug]), 'slug' => $slug, 'title' => $slug, 'is_active' => true]);
}

function createTestArticle($catId) {
    $author = User::first() ?? User::factory()->create();
    $article = Article::create([
        'locale' => 'ar',
        'title' => 'Title ' . uniqid(),
        'slug' => 'slug-' . uniqid(),
        'author_id' => $author->id,
        'published_by_id' => $author->id,
        'primary_category_id' => $catId,
        'status' => 'published',
        'published_at' => now()->subDay(),
        'type' => 'news',
        'content' => 'content',
        'excerpt' => 'excerpt',
    ]);
    return $article;
}

it('enforces maximum page limit for offset pagination', function () {
    Config::set('performance.pagination.max_page', 2);
    
    $this->getJson('/api/v1/ar/articles?page=1')->assertOk();
    $this->getJson('/api/v1/ar/articles?page=2')->assertOk();
    $this->getJson('/api/v1/ar/articles?page=3')
        ->assertNotFound()
        ->assertJsonFragment(['success' => false]);
});

it('allows deep scrolling when using cursor pagination', function () {
    Config::set('performance.pagination.max_page', 2);
    $cat = createTestCategory('cursor-cat');
    for($i=0; $i<6; $i++) createTestArticle($cat->id);
    
    $response = $this->getJson('/api/v1/ar/articles?paginate=cursor&per_page=5')->assertOk();
    $cursor = $response->json('meta.cursor.next');
    
    if ($cursor) {
        $this->getJson('/api/v1/ar/articles?paginate=cursor&per_page=5&cursor=' . urlencode($cursor))
            ->assertOk();
    }
});

it('returns identical counts for pure category filters using UNION', function () {
    $category = createTestCategory('union-cat');
    createTestArticle($category->id);
    createTestArticle($category->id);
    createTestArticle($category->id);
    
    $response = $this->getJson('/api/v1/ar/articles?filter[category]=' . $category->slug)
        ->assertOk();
        
    expect($response->json('meta.pagination.total'))->toBe(3);
});

it('falls back to standard count when mixed filters are used', function () {
    $category = createTestCategory('fallback-cat');
    createTestArticle($category->id);
    createTestArticle($category->id);
    
    $response = $this->getJson('/api/v1/ar/articles?filter[category]=' . $category->slug . '&filter[q]=test')
        ->assertOk();
        
    expect($response->json('meta.pagination.total'))->toBe(0);
});

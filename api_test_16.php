<?php
// Local test to see if Next.js local (localhost:3000) reproduces the issue.
// First, we find an article and ensure it's in world.
$article = \App\Models\Article::find(449741);
$article->update(['primary_category_id' => 43]);
$article->categories()->sync([43]);
\Illuminate\Support\Facades\Cache::tags(\App\Support\Cache\ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, ['local-news', 'world']))->flush();
\Illuminate\Support\Facades\Http::post('http://localhost:3000/api/revalidate', ['secret' => 'alpha-revalidate-9988', 'tags' => ['category:local-news', 'category:world', 'homepage']]);
sleep(2);

// Now we move it to local-news
$article->update(['primary_category_id' => 1]);
$article->categories()->sync([1]);
\Illuminate\Support\Facades\Cache::tags(\App\Support\Cache\ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, ['world', 'local-news']))->flush();
\Illuminate\Support\Facades\Http::post('http://localhost:3000/api/revalidate', ['secret' => 'alpha-revalidate-9988', 'tags' => ['category:local-news', 'category:world', 'homepage']]);

// Now we fetch from localhost:3000
$html = file_get_contents("http://localhost:3000/");
if (strpos($html, (string)$article->id) !== false) {
    echo "Article {$article->id} IS STILL in HTML!\n";
} else {
    echo "Article {$article->id} disappeared from HTML!\n";
}

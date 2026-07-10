<?php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Models\Article;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Content\ArticleCdnPurge;

$articleId = 449741;
$oldCatId = 43; // arab-world
$oldCatSlug = 'world'; 
$newCatId = 1; // local-news
$newCatSlug = 'local-news'; 

// 1. Ensure article is in arab-world to start and is NEWEST
$article = Article::find($articleId);
$article->primary_category_id = $oldCatId;
$article->published_at = now(); // Ensure it appears at the very top of page 1!
$article->save();

$tags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug, $newCatSlug]);
Cache::tags($tags)->flush();
ArticleCdnPurge::purge($article, '/ar/articles/'.$article->slug, [$oldCatSlug, $newCatSlug], [], null);

echo "Initial state set (arab-world & published_at=now). Waiting 2 seconds...\n";
sleep(2);

// 2. Perform the update to local-news
echo "Moving to local-news...\n";
$article->primary_category_id = $newCatId;
$article->save();

$flushTags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug]);
Cache::tags($flushTags)->flush();
ArticleCdnPurge::purge($article, '/ar/articles/'.$article->slug, [$oldCatSlug], [], null);

echo "Update & Flush Complete. Fetching immediately (<1s)...\n";

$localUrlOld = "http://localhost/api/v1/ar/articles?filter[category]={$oldCatSlug}";
$localUrlNew = "http://localhost/api/v1/ar/articles?filter[category]={$newCatSlug}";

$localRespOld = Http::get($localUrlOld)->json();
$localRespNew = Http::get($localUrlNew)->json();

$remoteUrlOld = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]={$oldCatSlug}";
$remoteUrlNew = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]={$newCatSlug}";

$remoteRespOld = Http::get($remoteUrlOld)->json();
$remoteRespNew = Http::get($remoteUrlNew)->json();

function checkPresence($data, $articleId) {
    if (!isset($data['data']) || !is_array($data['data'])) return false;
    foreach($data['data'] as $item) {
        if ($item['id'] == $articleId) return true;
    }
    return false;
}

$localOldHas = checkPresence($localRespOld, $articleId);
$localNewHas = checkPresence($localRespNew, $articleId);
$remoteOldHas = checkPresence($remoteRespOld, $articleId);
$remoteNewHas = checkPresence($remoteRespNew, $articleId);

echo "\n--- RESULTS ---\n";
echo "Local Backend API (localhost):\n";
echo "- Still in old category ({$oldCatSlug})? " . ($localOldHas ? 'YES (Stale!)' : 'NO (Clean)') . "\n";
echo "- Appeared in new category ({$newCatSlug})? " . ($localNewHas ? 'YES (Fresh)' : 'NO (Missing)') . "\n";

echo "\nRemote API (api.alpha-cms.shop):\n";
echo "- Still in old category ({$oldCatSlug})? " . ($remoteOldHas ? 'YES (Stale!)' : 'NO (Clean)') . "\n";
echo "- Appeared in new category ({$newCatSlug})? " . ($remoteNewHas ? 'YES (Fresh)' : 'NO (Missing)') . "\n";

$article->primary_category_id = $oldCatId;
$article->save();
$tags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug, $newCatSlug]);
Cache::tags($tags)->flush();
ArticleCdnPurge::purge($article, '/ar/articles/'.$article->slug, [$oldCatSlug, $newCatSlug], [], null);

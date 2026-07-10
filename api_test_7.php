<?php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;
use App\Models\Article;
use App\Support\Cache\ArticleCacheTags;
use App\Support\Content\ArticleCdnPurge;

$articleId = 449741;
$oldCatId = 43; // arab-world
$oldCatSlug = 'world'; 
$newCatId = 1; // local-news
$newCatSlug = 'local-news'; 

// 1. Initial State
$article = Article::find($articleId);
$article->primary_category_id = $oldCatId;
$article->published_at = now();
$article->save();

$tags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug, $newCatSlug]);
Cache::tags($tags)->flush();

echo "Initial state set (arab-world & published_at=now).\n";

// 2. Perform the update to local-news
echo "Moving to local-news...\n";
$article->primary_category_id = $newCatId;
$article->save();

$flushTags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug]);
Cache::tags($flushTags)->flush();

echo "Update & Flush Complete. Fetching immediately...\n";

// 3. Local API via internal kernel
function fetchLocal($slug) {
    global $app;
    $req = Request::create("/api/v1/ar/articles", 'GET', ['filter' => ['category' => $slug]]);
    // Must include headers if needed, but simple GET should work
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $resp = $kernel->handle($req);
    return json_decode($resp->getContent(), true);
}

$localRespOld = fetchLocal($oldCatSlug);
$localRespNew = fetchLocal($newCatSlug);

// 4. Remote API
$remoteRespOld = Http::get("https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]={$oldCatSlug}")->json();
$remoteRespNew = Http::get("https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]={$newCatSlug}")->json();

function checkPresence($data, $articleId) {
    if (!$data || !isset($data['data'])) return false;
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
echo "Local Backend API (Kernel):\n";
echo "- Still in old category ({$oldCatSlug})? " . ($localOldHas ? 'YES (Stale!)' : 'NO (Clean)') . "\n";
echo "- Appeared in new category ({$newCatSlug})? " . ($localNewHas ? 'YES (Fresh)' : 'NO (Missing)') . "\n";

echo "\nRemote API (api.alpha-cms.shop):\n";
echo "- Still in old category ({$oldCatSlug})? " . ($remoteOldHas ? 'YES (Stale!)' : 'NO (Clean)') . "\n";
echo "- Appeared in new category ({$newCatSlug})? " . ($remoteNewHas ? 'YES (Fresh)' : 'NO (Missing)') . "\n";

// Restore state
$article->primary_category_id = $oldCatId;
$article->save();
$tags = ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, [$oldCatSlug, $newCatSlug]);
Cache::tags($tags)->flush();

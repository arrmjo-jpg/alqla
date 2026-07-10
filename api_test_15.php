<?php
$url_html = "http://localhost:3000/";
$url_api_old = "http://127.0.0.1:8000/api/v1/ar/articles?filter[category]=world";
$url_api_new = "http://127.0.0.1:8000/api/v1/ar/articles?filter[category]=local-news";

function fetch_with_nocache($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Cache-Control: no-cache', 'Pragma: no-cache']);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

function get_api_ids($api_response) {
    $data = json_decode($api_response, true);
    $ids = [];
    if (isset($data['data'])) {
        foreach($data['data'] as $item) $ids[] = $item['id'];
    }
    return $ids;
}

$article = \App\Models\Article::find(449741);
$moved_id = $article->id;

// First, ensure it's in world
$article->update(['primary_category_id' => 43]);
$article->categories()->sync([43]);
\Illuminate\Support\Facades\Cache::tags(\App\Support\Cache\ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, ['local-news', 'world']))->flush();
\Illuminate\Support\Facades\Http::post('http://localhost:3000/api/revalidate', [
    'secret' => 'alpha-revalidate-9988',
    'tags' => ['category:local-news', 'category:world', 'homepage']
]);

sleep(2);

echo "Time\tAPI Old\tAPI New\tHTML\n";

for ($i=0; $i<15; $i++) {
    if ($i === 2) {
        $article->update(['primary_category_id' => 1]);
        $article->categories()->sync([1]);
        \Illuminate\Support\Facades\Cache::tags(\App\Support\Cache\ArticleCacheTags::writeTags($article->fresh(), 'ar', $article->slug, ['world', 'local-news']))->flush();
        
        \Illuminate\Support\Facades\Http::post('http://localhost:3000/api/revalidate', [
            'secret' => 'alpha-revalidate-9988',
            'tags' => ['category:local-news', 'category:world', 'homepage']
        ]);

        echo "--> ARTICLE MOVED AT T={$i}s <--\n";
    }
    
    $api_old_res = fetch_with_nocache($url_api_old);
    $api_new_res = fetch_with_nocache($url_api_new);
    $html_res = fetch_with_nocache($url_html);
    
    $api_old_has = in_array($moved_id, get_api_ids($api_old_res)) ? 'YES' : 'NO';
    $api_new_has = in_array($moved_id, get_api_ids($api_new_res)) ? 'YES' : 'NO';
    $html_has = (strpos($html_res, (string)$moved_id) !== false) ? 'YES' : 'NO';
    
    echo "T+{$i}s\t$api_old_has\t$api_new_has\t$html_has\n";
    sleep(1);
}

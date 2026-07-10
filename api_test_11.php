<?php

$url_html = "http://localhost:3000/";
$url_api_old = "http://127.0.0.1:8000/api/v1/ar/articles?filter[category]=world";
$url_api_new = "http://127.0.0.1:8000/api/v1/ar/articles?filter[category]=local-news";

function fetch_with_nocache($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Cache-Control: no-cache',
        'Pragma: no-cache'
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

function get_api_ids($api_response) {
    $data = json_decode($api_response, true);
    $ids = [];
    if (isset($data['data'])) {
        foreach($data['data'] as $item) {
            $ids[] = $item['id'];
        }
    }
    return $ids;
}

$article = \App\Models\Article::find(224475); // Ensure this article exists and is in 'world'
$moved_id = $article->id;

echo "Time\tAPI Old\tAPI New\tHTML\n";

for ($i=0; $i<60; $i++) {
    if ($i === 2) {
        // MOVE IT at T=2s
        $user = \App\Models\User::first();
        (new \App\Actions\Admin\Content\UpdateArticleAction)->handle($article, ['primary_category_id' => 2, 'categories' => [2]], $user);
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

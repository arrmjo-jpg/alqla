<?php

$url_html = "https://alpha-cms.shop/";
$url_api_old = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=????-????";
$url_api_new = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=?????-?????";

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

function extract_html_ids($html, $category_id) {
    // This is a naive extraction for the test. We know the Next.js app renders Next.js props or links.
    // Instead of parsing perfectly, let's just extract all IDs from the JSON hydration script,
    // or we just check if the ID exists in the raw HTML string (it will be in the href="/article/slug-ID" or similar).
    return $html;
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

echo "Monitoring for an article moving from 'world' to 'local-news'...\n";

$initial_old = get_api_ids(fetch_with_nocache($url_api_old));
$initial_new = get_api_ids(fetch_with_nocache($url_api_new));

$moved_id = null;

// Wait for a move
for ($i=0; $i<600; $i++) {
    $current_old = get_api_ids(fetch_with_nocache($url_api_old));
    
    // Find an ID that was in initial_old but is NO LONGER in current_old
    $missing = array_diff($initial_old, $current_old);
    if (!empty($missing)) {
        $moved_id = reset($missing);
        echo "DETECTED MOVE! Article $moved_id disappeared from API (world)!\n";
        break;
    }
    
    // Or if the user moved it to new without us noticing it missing yet
    $current_new = get_api_ids(fetch_with_nocache($url_api_new));
    $added = array_diff($current_new, $initial_new);
    if (!empty($added)) {
        $moved_id = reset($added);
        echo "DETECTED MOVE! Article $moved_id appeared in API (local-news)!\n";
        break;
    }
    sleep(2);
}

if (!$moved_id) {
    echo "No move detected.\n";
    exit;
}

echo "\nStarting Tracker for Article $moved_id...\n";
echo "Time\tAPI Old\tAPI New\tHTML Old\tHTML New\n";

$start_time = microtime(true);

for ($i=0; $i<60; $i++) {
    $t = round(microtime(true) - $start_time);
    
    $api_old_res = fetch_with_nocache($url_api_old);
    $api_new_res = fetch_with_nocache($url_api_new);
    $html_res = fetch_with_nocache($url_html);
    
    $api_old_ids = get_api_ids($api_old_res);
    $api_new_ids = get_api_ids($api_new_res);
    
    $api_old_has = in_array($moved_id, $api_old_ids) ? 'YES' : 'NO';
    $api_new_has = in_array($moved_id, $api_new_ids) ? 'YES' : 'NO';
    
    // For HTML, since we don't have a perfect DOM parser for the categories in Next.js, 
    // we just check if the ID appears in the HTML. Since it's a unique ID, if it's NO, it's missing.
    // If we want to be category specific, we can regex the chunk.
    // Actually, just checking if the ID exists in the HTML is a good proxy for "is it on the page".
    // But since the user wants to know if it's in the OLD category or NEW category in HTML...
    // The Next.js page renders `<LatestUpdates categoryId={2}>` for local-news and `<CategoryFeatureQuad categoryId={43}>` for world.
    $html_old_has = (strpos($html_res, (string)$moved_id) !== false) ? 'YES (Anywhere)' : 'NO';
    $html_new_has = (strpos($html_res, (string)$moved_id) !== false) ? 'YES (Anywhere)' : 'NO';
    
    echo "T+{$t}s\t$api_old_has\t$api_new_has\t$html_old_has\n";
    
    if ($api_new_has === 'YES' && strpos($html_res, (string)$moved_id) !== false && $api_old_has === 'NO') {
        // We might need to wait for Next.js to fully update, so let's keep logging.
    }
    
    sleep(2);
}


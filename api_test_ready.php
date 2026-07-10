<?php
$target_article_id = "INSERT_ID_HERE"; // The user will provide this or we just search by a keyword

function fetch_and_check($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // Add no-cache headers to ensure we bypass any local network cache
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Cache-Control: no-cache',
        'Pragma: no-cache'
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

$html = fetch_and_check('https://alpha-cms.shop/');
// The slug for '???? ????' is '????-????' and for '??????' is '?????-?????'
$api_old = fetch_and_check('https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=????-????');
$api_new = fetch_and_check('https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=?????-?????');

file_put_contents('test_html.txt', $html);
file_put_contents('test_api_old.json', $api_old);
file_put_contents('test_api_new.json', $api_new);

echo "Fetched successfully. Analyzing...\n";
// We can then grep the files for the article title.

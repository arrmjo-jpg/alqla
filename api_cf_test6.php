<?php
$url = "https://api.alpha-cms.shop/api/v1/ar/categories";
$response = file_get_contents($url);
$data = json_decode($response, true);
foreach($data['data'] as $cat) {
    if (strpos($cat['name'], '??????') !== false) {
        echo "Slug for ??????: " . $cat['slug'] . "\n";
    }
}

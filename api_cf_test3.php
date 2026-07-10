<?php
$url = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=local-news";
$start = microtime(true);
$response = file_get_contents($url);
$time = microtime(true) - $start;
$data = json_decode($response, true);
$ids = [];
if (isset($data['data'])) {
    foreach ($data['data'] as $item) {
        $ids[] = $item['id'];
    }
}
echo "Time: {$time}s\n";
echo "First 5 IDs: " . implode(', ', array_slice($ids, 0, 5)) . "\n";

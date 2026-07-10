<?php
$url = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=local-news";
$start = microtime(true);
$response = file_get_contents($url);
echo $response;

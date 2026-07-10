<?php
$url = "https://api.alpha-cms.shop/api/v1/ar/categories";
$response = file_get_contents($url);
echo $response;

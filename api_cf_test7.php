<?php
$ch = curl_init("https://api.alpha-cms.shop/api/v1/ar/homepage");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$header = substr($response, 0, $header_size);
curl_close($ch);
echo $header;

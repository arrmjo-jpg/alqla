<?php
function fetchHeadersAndBody($url, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    $response = curl_exec($ch);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $header_size);
    curl_close($ch);
    return $header;
}

function parseImportantHeaders($rawHeaders) {
    $important = ['cf-cache-status', 'age', 'cache-control', 'etag', 'last-modified', 'date', 'x-ratelimit-remaining'];
    $lines = explode("\r\n", $rawHeaders);
    $extracted = [];
    foreach ($lines as $line) {
        $parts = explode(':', $line, 2);
        if (count($parts) == 2) {
            $key = strtolower(trim($parts[0]));
            if (in_array($key, $important)) {
                $extracted[$key] = trim($parts[1]);
            }
        }
    }
    return $extracted;
}

$url = "https://api.alpha-cms.shop/api/v1/ar/articles?filter[category]=local-news";

echo "--- 1. IMMEDIATE FETCH (T=0) ---\n";
$headers = fetchHeadersAndBody($url);
print_r(parseImportantHeaders($headers));

sleep(5);
echo "\n--- 2. FETCH AFTER 5s (T=5) ---\n";
$headers = fetchHeadersAndBody($url);
print_r(parseImportantHeaders($headers));

sleep(25); // total 30s
echo "\n--- 3. FETCH AFTER 30s (T=30) ---\n";
$headers = fetchHeadersAndBody($url);
print_r(parseImportantHeaders($headers));

echo "\n--- 4. FETCH WITH Cache-Control: no-cache ---\n";
$headers = fetchHeadersAndBody($url, ['Cache-Control: no-cache']);
print_r(parseImportantHeaders($headers));

echo "\n--- 5. FETCH WITH Pragma: no-cache ---\n";
$headers = fetchHeadersAndBody($url, ['Pragma: no-cache']);
print_r(parseImportantHeaders($headers));

echo "\n--- 6. FETCH WITH ?_debug=timestamp ---\n";
$headers = fetchHeadersAndBody($url . "&_debug=" . time());
print_r(parseImportantHeaders($headers));

<?php
$r = Illuminate\Support\Facades\Http::get('http://localhost/api/v1/ar/articles?filter[category]=local-news');
echo $r->status() . " - " . substr($r->body(), 0, 100);

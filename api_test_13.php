<?php
$cat1 = \App\Models\Category::where('slug', 'world')->first();
$cat2 = \App\Models\Category::where('slug', 'local-news')->first();
echo "world ID: " . $cat1->id . "\n";
echo "local-news ID: " . $cat2->id . "\n";

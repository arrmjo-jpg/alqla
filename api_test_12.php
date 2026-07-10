<?php
$cat1 = \App\Models\Category::where('slug', 'world')->first();
$article = $cat1->articles()->first();
echo "Article ID: " . $article->id . "\n";

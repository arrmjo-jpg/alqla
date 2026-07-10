<?php
$cats = \App\Models\Category::all();
foreach($cats as $c) {
    echo $c->slug . "\n";
}

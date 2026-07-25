<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * تاريخ المسارات القانونية للتصنيف — مرآة ArticleUrlHistory. resolver الـ 301
 * العام في CategoryRedirectResolver.
 */
class CategoryUrlHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'category_url_history';

    protected $fillable = [
        'category_id', 'locale', 'old_path', 'reason',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}

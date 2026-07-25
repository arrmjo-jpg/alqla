<?php

declare(strict_types=1);

namespace App\Actions\Admin\Media;

use App\Models\MediaAsset;
use App\Support\Cache\MediaCacheInvalidator;

/**
 * تحديث البيانات الوصفية التحريرية (alt/caption/credit/source) لأصل موجود
 * دون إعادة رفع الملف. عبر Eloquent → يُدقَّق تلقائياً (alt/caption/credit/source
 * ضمن auditAttributes للنموذج).
 */
class UpdateMediaAssetAction
{
    public function handle(MediaAsset $asset, array $validated): MediaAsset
    {
        foreach (['alt', 'caption', 'credit', 'source'] as $field) {
            if (array_key_exists($field, $validated)) {
                $asset->{$field} = $validated[$field];
            }
        }

        $asset->save();

        // alt/caption تظهر علنياً في صفحات المحتوى المالك — يجب إبطال كاشه فوراً
        // (تعديل الأصل نفسه لا يُعيد حفظ Article/Category/... المالك).
        MediaCacheInvalidator::invalidate($asset);

        return $asset->fresh();
    }
}

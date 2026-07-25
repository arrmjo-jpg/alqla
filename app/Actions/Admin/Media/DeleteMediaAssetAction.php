<?php

declare(strict_types=1);

namespace App\Actions\Admin\Media;

use App\Models\MediaAsset;
use App\Support\Cache\MediaCacheInvalidator;
use App\Support\Media\MediaFileCleaner;
use App\Support\Media\MediaUsage;

/**
 * حذف أصل مكتبة مع حارس استخدام (delete guard).
 *
 * إن كان الأصل مُستخدَماً من أيّ مستهلك (المصدر الوحيد: MediaUsage) ولم يُمرَّر
 * force=true → لا يُحذف (يُعاد عدد الاستخدام). مع force → يُحذف: الملفات (الأصل/
 * المشتقّات/HLS) ثم النموذج عبر Eloquent (يُدقَّق + يُسلسِل حذف صفوف article_media
 * عبر cascade؛ ومراجع nullOnDelete تُفرَّغ في الفيديو/الأعداد).
 *
 * @return array{deleted:bool,usage_count:int}
 */
class DeleteMediaAssetAction
{
    public function handle(MediaAsset $asset, bool $force = false): array
    {
        $usageCount = MediaUsage::count($asset);

        if ($usageCount > 0 && ! $force) {
            return ['deleted' => false, 'usage_count' => $usageCount];
        }

        // قبل الحذف: العلاقات ما زالت قابلة للاستعلام هنا (nullOnDelete/cascade
        // يُفرَّغها بعد delete())، فيجب إبطال كاش المالكين الآن وإلا يبقى بلا فرصة.
        MediaCacheInvalidator::invalidate($asset);

        MediaFileCleaner::purge($asset);
        $asset->delete();

        return ['deleted' => true, 'usage_count' => $usageCount];
    }
}

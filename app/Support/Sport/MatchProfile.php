<?php

declare(strict_types=1);

namespace App\Support\Sport;

/**
 * نقطة مركزية واحدة لأسماء Profiles تجميع المباراة — بدل تكرار السلاسل النصية ('base', 'overview'...)
 * بين الـController/الـAction/الخدمة/الكاش. راجع MatchAggregateService لتصنيف A (أساسي، Base) مقابل
 * B (مشروط بالتبويب — Overview/Stats/Trends).
 */
enum MatchProfile: string
{
    case Base = 'base';
    case Overview = 'overview';
    case Stats = 'stats';
    case Trends = 'trends';

    /** المدعومة فعلياً حالياً بـMatchAggregateService — الباقي محجوز، يُفعَّل تباعاً بلا تغيير هنا. */
    public function isSupported(): bool
    {
        return $this === self::Base;
    }
}

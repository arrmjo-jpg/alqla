<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\Content\TipTapSanitizer;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * يرفض أي مستند TipTap يحوي عقدة/علامة/سمة غير مسموحة (P4-D1).
 */
class ValidTipTapDocument implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // يتحقّق من القيمة الخام مباشرةً — لا من ناتج clean(): clean يُسقِط/يُصلِح الروابط
        // والتضمينات والمحاذاة غير الصالحة بصمت ليجتاز ناتجه validate() دائماً (خاصّية
        // مقصودة لتخزين نسخة نظيفة في الـ Action)، فتمرير القيمة عبر clean() قبل التحقّق
        // يُبطِل الرفض المقصود تحديداً لهذه الحالات (P4-D1 مقفول: رفض صريح لا تعقيم صامت).
        // التلوّث القابل للاسترداد (مسافات/اقتباسات محيطة بالرابط) يبقى مقبولاً لأنّ
        // safeUrl() نفسها تُطبِّع الرابط قبل فحص المخطّط، حتى على القيمة الخام.
        if (! is_array($value) || ! TipTapSanitizer::validate($value)) {
            $fail(__('article.invalid_content'));
        }
    }
}

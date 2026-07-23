<?php

declare(strict_types=1);

namespace App\Actions\Admin\Content;

use App\Http\Resources\Admin\Content\TagResource;
use App\Support\Frontend\FrontendRevalidate;
use App\Support\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Tags\Tag;

/**
 * إعادة تسمية وسم — يضبط ترجمة الاسم لكل لغة مزوَّدة، ويُعيد توليد الـslug عبر نفس
 * slugger الافتراضيّ لـ Spatie (Str::slug). لو أنتج slugger نصاً فارغاً (مثل العربية)
 * يُبقى الـslug القائم بلا تغيير — تطابقاً لسلوك الإنشاء ودون كسر روابط قائمة.
 */
class UpdateTagAction
{
    /** @param  array{name: array<string,string|null>}  $validated */
    public function handle(Tag $tag, array $validated): JsonResponse
    {
        $oldNames = array_values($tag->getTranslations('name'));

        foreach ($validated['name'] as $locale => $value) {
            $value = trim((string) $value);
            if ($value === '') {
                continue;
            }

            $tag->setTranslation('name', $locale, $value);

            $slug = Str::slug($value);
            if ($slug !== '') {
                $tag->setTranslation('slug', $locale, $slug);
            }
        }

        $tag->save();

        $tag->usage_count = (int) DB::table('taggables')->where('tag_id', $tag->id)->count();

        // مقالات مُبطَّلة أصلاً عبر FrontendCacheTags::article() عند حفظها، لكن Article::tags()
        // يُخزِّن اسم الوسم وقت الحفظ — إعادة تسمية الوسم هنا لا تُعيد حفظ كل مقال يستخدمه، فتبقى
        // صفحة tag:{الاسم القديم} مُخبَّأة على القيمة القديمة دون هذا الإبطال الصريح.
        $newNames = array_values($tag->getTranslations('name'));
        FrontendRevalidate::tags(array_map(
            static fn (string $name): string => "tag:{$name}",
            array_unique(array_merge($oldNames, $newNames))
        ));

        return ApiResponse::success(
            message: __('tag.updated'),
            data: new TagResource($tag),
        );
    }
}

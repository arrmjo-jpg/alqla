<?php

declare(strict_types=1);

namespace App\Http\Resources\Public;

use App\Models\User;
use App\Support\Media\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * مورد بروفيل الكاتب العام — **حقول آمنة للنشر فقط** (لا بريد/حالة/أدوار/تسجيل دخول/أسرار).
 * يُعاد فقط لمستخدم is_writer نشِط (البوّابة في ShowPublicWriterAction).
 *
 * الصورة: Spatie media (مجموعة avatar) أولاً، وإلا العمود النصّي users.avatar (نفس مصدر
 * صورة الكاتب المستخدَمة في شارة الأخبار عبر Article::authorAvatarUrl()) — أغلب الكتّاب
 * لديهم صورهم في العمود النصّي فقط ولا شيء في Spatie media (2026-08-08، تعارض المصدرين).
 *
 * @mixin User
 */
class PublicWriterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'url' => "/news/writer/{$this->id}-{$this->slug}",
            'avatar' => $this->getFirstMediaUrl('avatar', 'thumb') ?: MediaUrl::forPublic($this->avatar),
            'bio' => $this->bio,
            'social_links' => (object) ($this->social_links ?? []),
            'articles_count' => $this->whenCounted('articles'),
            'last_activity_at' => $this->whenHas('last_activity_at', fn() => $this->last_activity_at),
            'verified' => (bool) ($this->is_verified ?? false),
        ];
    }
}

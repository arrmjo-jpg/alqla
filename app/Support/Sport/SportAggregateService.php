<?php

declare(strict_types=1);

namespace App\Support\Sport;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * أساس مشترك لخدمات تجميع بيانات 365Scores (Player/Match/Team قادمتان) — يوحّد ما كان سيتكرر ثلاث
 * مرات: Http::pool، معالجة ConnectionException (خطأ حقيقي اكتُشف تجريبياً أثناء بناء
 * PlayerAggregateService — Http::pool() يُرجعها بدل Response عند فشل اتصال حقيقي، لا استجابة HTTP
 * بحالة خطأ)، تتبّع partial، والتسجيل. كل خدمة فرعية تُطبّق aggregate() وcommonParams() الخاصَّين بها
 * فقط + منطق الدمج/التحليل الخاص بكيانها؛ لا تُعيد كتابة أيٍّ من الأساسيات أدناه.
 *
 * حدّ متعمَّد: التخزين المؤقت (Cache/CachedRead) يبقى بطبقة الـ Action لا هنا (نفس نمط
 * ShowPublicVideoAction بالمشروع بالفعل) — كل كيان له CacheKeys/CacheTags/Ttl مختلفة تماماً؛ دمجها
 * هنا كان سيخلط مسؤولية "التجميع" بمسؤولية "التخزين المؤقت + شكل استجابة HTTP".
 */
abstract class SportAggregateService
{
    private const LOG_CHANNEL = 'perf';

    protected bool $partial = false;

    /** @return array<string,mixed> */
    abstract public function aggregate(int $id): array;

    /** معاملات مشتركة ثابتة لهذا النوع من الكيانات — appTypeId يختلف فعلياً بين athletes (5) وgames (3). */
    abstract protected function commonParams(): array;

    protected function resetPartial(): void
    {
        $this->partial = false;
    }

    protected function isPartial(): bool
    {
        return $this->partial;
    }

    /** نداء HTTP مفرد (غير Pool) — للحالات التي لا تحتاج توازياً (مثل الملف الأساسي لكيان). */
    protected function get(string $path, array $params): Response
    {
        return Http::acceptJson()
            ->timeout((int) config('sport.http_timeout', 8))
            ->get($this->url($path), $this->commonParams() + $params);
    }

    /** طلب داخل Pool — نفس مهلة get() أعلاه. تنبيه: تسمية as() يجب أن تطابق مفتاح المصفوفة الخارجي
     *  حرفياً عند بناء طلبات Pool متعددة — Http::pool() يُرجع النتائج مفهرَسة بتسميات as() لا بأي
     *  مفتاح آخر (خطأ حقيقي وقع فيه PlayerAggregateService أول مرة، راجع سجل التطوير). */
    protected function pooled(Pool $pool, string $as): PendingRequest
    {
        return $pool->as($as)->acceptJson()->timeout((int) config('sport.http_timeout', 8));
    }

    protected function url(string $path): string
    {
        return rtrim((string) config('sport.api_base'), '/').'/'.$path;
    }

    /**
     * نتيجة Pool غير Response — إمّا مفقودة (نظرياً فقط) أو ConnectionException حقيقي. كلاهما فشل
     * جزئي حقيقي يستاهل partial=true، بعكس 204/رفض HTTP الطبيعي (يُعالَج داخل كل خدمة فرعية بمعرفة
     * خاصة بكيانها — مثلاً 204 على athletes/career يعني "لا بيانات لهذا الموسم"، ليس فشلاً).
     */
    protected function logPoolMiss(string $stage, array $context, Response|ConnectionException|null $res): void
    {
        $this->logFailure(
            $stage,
            $context,
            $res instanceof ConnectionException ? $res : null,
            $res === null ? 'no response in pool' : null,
        );
    }

    protected function logFailure(string $stage, array $context, ?Throwable $e, ?string $reason = null): void
    {
        $this->partial = true;
        Log::channel(self::LOG_CHANNEL)->warning(static::class.': partial failure', [
            'stage' => $stage,
            ...$context,
            'reason' => $reason ?? $e?->getMessage(),
        ]);
    }
}

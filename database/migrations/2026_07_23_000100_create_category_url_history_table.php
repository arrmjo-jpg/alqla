<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * سجلّ المسارات القانونية القديمة للتصنيفات — يلتقط canonicalPath() السابق عند
 * تغيّر slug و/أو locale، فيُمكِّن إعادة توجيه 301 (حفظ قيمة SEO ومنع كسر
 * الروابط). مرآة article_url_history تماماً (نفس الأعمدة، نفس الفرادة).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_url_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->string('locale', 10);
            $table->string('old_path', 255);
            $table->string('reason', 50)->nullable();
            $table->timestamp('created_at')->nullable()->index();

            $table->unique(['locale', 'old_path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_url_history');
    }
};

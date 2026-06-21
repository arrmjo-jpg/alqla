import { ChevronLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { getAseTicker } from '@/lib/ase-market';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';
import { getLatestGold } from '@/lib/gold';
import { aseMarketStatus } from '@/lib/market';

import { BourseRotator } from './bourse-rotator';
import { GoldWidget } from './gold-widget';

// تصنيف الاقتصاد بالـID الثابت (#47) — يُحلّ ID→slug/اسم حاليّ وقت التشغيل (مقاوم لإعادة التسمية).
const ECONOMY_CATEGORY_ID = 47;

// قسم الاقتصاد — خلفيّة بيضاء، **شريط عنوان أحمر بعرض الموقع (الاسم فقط)**، جسم أبيض:
// شبكة أخبار (نمط «يقرأون الآن») + شريط جانبيّ بنفس ارتفاع الشبكة فيه بورصة عمّان الدوّارة + أسعار الذهب.
export async function EconomyShowcase() {
  const category = await getCategoryById(ECONOMY_CATEGORY_ID);
  const [gold, articles, aseTicker] = await Promise.all([
    getLatestGold(),
    category ? getCategoryFeed(category.slug, 6) : Promise.resolve<FeedItem[]>([]),
    getAseTicker(),
  ]);

  if (articles.length === 0 && !gold) return null;

  const market = aseMarketStatus();
  const moreHref = category ? `/category/${encodeURIComponent(category.slug)}` : '/economy';
  const title = category?.name.trim() || 'اقتصاد';

  return (
    <section className="mt-6 bg-white sm:mt-8" dir="rtl" aria-labelledby="economy-heading">
      {/* شريط العنوان الأحمر — بعرض الموقع، الاسم فقط (لا القسم كامل) */}
      <div className="bg-primary text-white">
        <Container className="flex items-center justify-between gap-4 py-3 sm:py-4">
          <h2 id="economy-heading" className="font-heading text-xl font-extrabold sm:text-2xl">
            <Link href={moreHref} className="transition-opacity hover:opacity-80">
              {title}
            </Link>
          </h2>
          <Link
            href={moreHref}
            className="flex shrink-0 items-center gap-1 border border-white/40 px-3 py-1.5 text-sm font-bold transition hover:bg-white/10"
            style={{ borderRadius: '9999px' }}
          >
            المزيد
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Container>
      </div>

      {/* جسم القسم — أبيض: شبكة أخبار + شريط ماليّ جانبيّ (بنفس الارتفاع عبر items-stretch) */}
      <Container className="py-8 sm:py-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-4">
          {/* الأخبار (نمط «يقرأون الآن») */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {articles.slice(0, 6).map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* الشريط الجانبيّ — يملأ ارتفاع الشبكة: بورصة دوّارة + ويدجت ذهب */}
          <aside className="flex flex-col gap-4 lg:h-full">
            <BourseRotator items={aseTicker ?? []} marketOpen={market.open} marketLabel={market.label} />
            <GoldWidget gold={gold} className="min-h-0 flex-1" />
          </aside>
        </div>
      </Container>
    </section>
  );
}

// بطاقة خبر نظيفة (نمط المرجع): صورة 16:9 + عنوان سطرين + تاريخ نسبيّ. رابط الخبر بمعرّفه في المسار.
function NewsCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-3" style={{ borderRadius: '10px' }}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
          <img
            src={item.image}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
        {/* تاج عاجل/تغطية خاصة */}
        <FeedBadge badge={item.badge} />
      </div>
      <h3 className="mt-2.5 line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary">
        {item.title}
      </h3>
      {item.publishedAt && (
        <time dateTime={item.publishedAt} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-muted">
          <Clock className="size-3 shrink-0" aria-hidden />
          {formatRelativeTime(item.publishedAt)}
        </time>
      )}
    </article>
  );
}

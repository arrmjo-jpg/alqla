import { Clock } from 'lucide-react';
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { SectionHeader, SectionMore } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// قسم تصنيف مُدمج (بديل الكروسل): عدد ثابت من الأخبار (count، افتراضيًّا 4)، **بلا سكرول أفقيّ**، بتخطيطين متجاوبين:
//   • جوّال/لوحيّ (<1024px): الأوّل بطاقة كبيرة (16:9 + مقتطف + تاريخ) + الباقي صغار (مصغّرة 110×70 + عنوان)، مكدّس.
//   • ديسكتوب (≥1024px): بطاقات متساوية جنبًا إلى جنب (عمود لكلّ خبر؛ 4 أو 5).
// الكتلتان تستعملان نفس روابط الصور ⇒ لا تحميل مزدوج (تُحلّ بكاش المتصفّح). ID ثابت (مقاوم لإعادة
// التسمية)، Server Component/ISR. لا مقالات/قسم محذوف ⇒ يُخفى.
export async function CategoryFeatureQuad({
  categoryId,
  fallbackTitle,
  count = 4,
}: {
  categoryId: number;
  fallbackTitle?: string;
  count?: number;
}) {
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, count);
  if (items.length === 0) return null;

  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;
  const headingId = `quad-${categoryId}-heading`;
  // ديسكتوب: عدد الأعمدة = عدد الأخبار (4 أو 5). صريح كي يلتقطه Tailwind JIT.
  const desktopColsClass = count >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4';

  const feature = items[0];
  const list = items.slice(1, count);

  return (
    <section className="mt-6 sm:mt-8" aria-labelledby={headingId}>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض (بلا شحطة، بلا رابط علويّ). */}
        <SectionHeader title={title} headingId={headingId} href={moreHref} />

        {/* الجوّال/اللوحيّ: الأوّل كبير + 3 صغار (مكدّس، بلا سكرول أفقيّ). */}
        <div className="grid grid-cols-1 gap-6 lg:hidden">
          {feature && <FeatureCard item={feature} />}
          {list.length > 0 && (
            <ul className="divide-y divide-border">
              {list.map((item) => (
                <SmallItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {/* الديسكتوب (≥1024px): بطاقات متساوية جنبًا إلى جنب (عمود لكلّ خبر). */}
        <div className={`hidden gap-5 lg:grid ${desktopColsClass}`}>
          {items.slice(0, count).map((item) => (
            <GridCard key={item.id} item={item} />
          ))}
        </div>

        {/* «عرض الكل» أسفل القسم (نُقِل من أعلاه). */}
        <SectionMore href={moreHref} />
      </div>
    </section>
  );
}

// البطاقة الكبيرة — صورة 16:9 + قسم + عنوان + مقتطف + تاريخ. رابط متراكب يغطّي البطاقة.
function FeatureCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
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
        <FeedBadge badge={item.badge} />
      </div>
      <div className="pt-4">
        <CategoryLabel item={item} />
        <h3 className="mt-1.5 text-lg font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-xl">
          {item.title}
        </h3>
        {item.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{item.excerpt}</p>}
        {item.publishedAt && (
          <span className="mt-2 flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3 shrink-0" aria-hidden />
            <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt)}</time>
          </span>
        )}
      </div>
    </article>
  );
}

// بطاقة الديسكتوب المتساوية — صورة 16:9 + قسم + عنوان (بلا مقتطف؛ عمود ضيّق في شبكة 4).
function GridCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
          <img
            src={item.image}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
        <FeedBadge badge={item.badge} />
      </div>
      <div className="pt-3">
        <CategoryLabel item={item} small />
        <h3 className="mt-1 line-clamp-3 text-sm font-bold leading-6 text-fg transition-colors group-hover:text-primary">
          {item.title}
        </h3>
      </div>
    </article>
  );
}

// عنصر صغير — مصغّرة 110×70 + عنوان + قسم.
function SmallItem({ item }: { item: FeedItem }) {
  return (
    <li className="group relative py-4 first:pt-0 last:pb-0">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="flex items-start gap-3">
        <div className="relative h-[70px] w-[110px] shrink-0 overflow-hidden bg-surface-2">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
            <img
              src={item.image}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="size-full bg-surface-3" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-bold leading-6 text-fg transition-colors group-hover:text-primary">
            {item.title}
          </h4>
          <div className="mt-1">
            <CategoryLabel item={item} small />
          </div>
        </div>
      </div>
    </li>
  );
}

// شارة القسm (أحمر) — رابط مستقلّ فوق الرابط المتراكب.
function CategoryLabel({ item, small = false }: { item: FeedItem; small?: boolean }) {
  if (!item.category) return null;
  const cls = `font-extrabold text-primary ${small ? 'text-[10px]' : 'text-xs'}`;
  return item.categoryHref ? (
    <Link href={item.categoryHref} className={`relative z-20 ${cls} hover:underline`}>
      {item.category}
    </Link>
  ) : (
    <span className={cls}>{item.category}</span>
  );
}

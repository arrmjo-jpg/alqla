
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { SectionHeader, SectionMore } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';

// قسم مخصص لتصميم 3 أعمدة (صورة رئيسية كبيرة في الوسط، وبطاقات على الأطراف)
// مخصص لقسم "عربي دولي" ليعطيه شكلاً إخبارياً كلاسيكياً فخماً.
export async function CategoryThreeCol({
  categoryId,
  fallbackTitle,
  count = 8,
  bgImage,
}: {
  categoryId: number;
  fallbackTitle?: string;
  count?: number;
  bgImage?: string;
}) {
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, count);
  if (items.length === 0) return null;

  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;
  const headingId = `threecol-${categoryId}-heading`;

  const feature = items[0];
  const list = items.slice(1, count);

  return (
    <section
      className={`relative z-0 mt-6 sm:mt-8 overflow-hidden ${
        bgImage ? 'py-8 sm:py-10 border-y border-border' : ''
      }`}
      aria-labelledby={headingId}
    >
      {bgImage && (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${bgImage})`, opacity: 0.15 }}
        />
      )}
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeader title={title} headingId={headingId} href={moreHref} />

        {/* الجوّال/اللوحيّ: الأوّل كبير + الباقي صغار (مكدّس). */}
        <div className="grid grid-cols-1 gap-6 lg:hidden">
          {feature && <FeatureCard item={feature} />}
          {list.length > 0 && (
            <ul className="flex flex-col divide-y divide-dashed divide-border/80">
              {list.map((item) => (
                <SmallItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {/* الديسكتوب (≥1024px): التخطيط الجديد (3 أعمدة) إذا كان العدد >= 8 */}
        {count >= 8 ? (
          <div className="hidden gap-6 lg:grid lg:grid-cols-12">
            {/* العمود الأيمن: بطاقتان متوسطتان (Item 1 & 2) */}
            <div className="col-span-3 flex flex-col gap-6">
              {items.slice(1, 3).map((item) => (
                <GridCard key={item.id} item={item} />
              ))}
            </div>

            {/* العمود الأوسط: الخبر الرئيسي (Item 0) */}
            <div className="col-span-5 flex flex-col">
              {feature && <FeatureCard item={feature} largeTitle />}
            </div>

            {/* العمود الأيسر: قائمة الأخبار الصغيرة (Item 3 to end) متقطعة */}
            <div className="col-span-4 pl-2">
              <ul className="flex flex-col divide-y divide-dashed divide-border/70">
                {items.slice(3, count).map((item) => (
                  <SmallItem key={item.id} item={item} />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="hidden gap-5 lg:grid lg:grid-cols-4">
            {items.slice(0, count).map((item) => (
              <GridCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <SectionMore href={moreHref} />
      </div>
    </section>
  );
}

// البطاقة الكبيرة (الرئيسية في الوسط)
function FeatureCard({ item, largeTitle }: { item: FeedItem; largeTitle?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[14px] bg-surface-2 shadow-sm">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
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
      <div className="pt-4 text-start">
        <h3 className={`font-bold leading-[1.4] text-fg transition-colors group-hover:text-primary ${largeTitle ? 'text-xl sm:text-[22px]' : 'text-lg sm:text-xl'}`}>
          {item.title}
        </h3>
        {item.excerpt && <p className="mt-2.5 line-clamp-3 text-[14px] leading-relaxed text-muted-fg">{item.excerpt}</p>}
      </div>
    </article>
  );
}

// بطاقات العمود الأيمن (صورتان تحت بعض)
function GridCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-surface-2 shadow-sm">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
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
      <div className="pt-3 text-start">
        <h3 className="line-clamp-3 text-[15px] font-bold leading-[1.5] text-fg transition-colors group-hover:text-primary">
          {item.title}
        </h3>
      </div>
    </article>
  );
}

// القائمة اليسرى (الصغيرة ذات الخطوط المتقطعة)
function SmallItem({ item }: { item: FeedItem }) {
  return (
    <li className="group relative py-3.5 first:pt-0 last:pb-0">
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="flex items-start gap-4">
        <div className="relative h-[72px] w-[110px] shrink-0 overflow-hidden rounded-[10px] bg-surface-2 shadow-sm">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
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
        <div className="min-w-0 flex-1 pt-0.5 text-start">
          <h4 className="line-clamp-3 text-[14px] font-bold leading-snug text-fg transition-colors group-hover:text-primary">
            {item.title}
          </h4>
        </div>
      </div>
    </li>
  );
}

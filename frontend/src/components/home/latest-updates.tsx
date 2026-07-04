import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

import { CategoryChip, FeedBadge } from './featured-hero';
import { SectionHeader, SectionMore } from './section-header';

// كتلة «أخبار محلية» (تصنيف بالـID الثابت): كرت رئيسيّ بتراكب صورة + شبكة كروت بيضاء.
// **التصنيف بالـID** (مقاوم لإعادة التسمية، ويطابق الأخبار متعدّدة الأقسام رئيسيًّا أو ثانويًّا في الباك)؛
// العنوان = اسم القسم الحاليّ، و«عرض الكل» → صفحة القسم. لا مقالات/قسم محذوف ⇒ يُخفى.
export async function LatestUpdates({
  categoryId,
  fallbackTitle,
}: {
  categoryId: number;
  fallbackTitle?: string;
}) {
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, 9);
  if (items.length === 0) return null;

  const title = category.name.trim() || fallbackTitle || 'أخبار محلية';
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;
  const [lead, ...rest] = items;
  const grid = rest.slice(0, 8);

  return (
    <section className="mt-6 sm:mt-8" aria-labelledby="local-news-heading">
      <Container>
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
        <SectionHeader title={title} headingId="local-news-heading" href={moreHref} />

        {/* كرت رئيسيّ + شبكة — ارتفاع ثابت متطابق على سطح المكتب (md) */}
        <div className="flex flex-col gap-4 md:h-[440px] md:flex-row md:gap-6">
          <div className="md:h-full md:w-[42%]">
            <LeadCard item={lead} />
          </div>
          {grid.length > 0 && (
            <ul className="grid flex-1 grid-cols-1 gap-2 md:h-full md:grid-cols-2 md:grid-rows-4 md:gap-3">
              {grid.map((item) => (
                <li key={item.id} className="md:h-full">
                  <ListCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* «عرض الكل» أسفل القسم (نُقِل من أعلاه). */}
        <SectionMore href={moreHref} />
      </Container>
    </section>
  );
}

// الكرت الرئيسيّ: صورة كبيرة + تدرّج + شارة (تغطية مباشرة/عاجل) + قسم حمراء + عنوان + تاريخ نسبيّ.
function LeadCard({ item }: { item: FeedItem }) {
  return (
    <div
      className="group relative block aspect-[16/10] transform-gpu overflow-hidden bg-surface-2 will-change-transform md:aspect-auto md:h-full"
      style={{ borderRadius: '12px' }}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      <OptimizedImage
        cover={item.cover}
        src={item.image}
        alt={item.imageAlt}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="absolute inset-0 size-full transform-gpu object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
        aria-hidden
      />

      <FeedBadge badge={item.badge} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip name={item.category} href={item.categoryHref} />
          {item.publishedAt && (
            <time dateTime={item.publishedAt} className="text-caption font-medium text-white/85">
              {formatRelativeTime(item.publishedAt)}
            </time>
          )}
        </div>
        <h3 className="line-clamp-3 font-heading text-lg font-extrabold leading-tight text-white sm:text-xl">
          {item.title}
        </h3>
      </div>
    </div>
  );
}

// كرت القائمة: صورة مربّعة (بداية) + عنوان + اسم القسم بالأحمر (رابط مستقلّ) — كرت أبيض بحدّ.
function ListCard({ item }: { item: FeedItem }) {
  return (
    <div
      className="group relative flex h-full items-center gap-3 border border-border bg-surface p-2 transition hover:border-primary/30 hover:shadow-sm"
      style={{ borderRadius: '10px' }}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      <div
        className="relative size-[84px] shrink-0 overflow-hidden bg-surface-2"
        style={{ borderRadius: '8px' }}
      >
        <OptimizedImage
          cover={item.cover}
          src={item.image}
          alt={item.imageAlt}
          sizes="84px"
          className="size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 text-start">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[15px]">
          {item.title}
        </h3>
        {item.category &&
          (item.categoryHref ? (
            <Link
              href={item.categoryHref}
              className="relative z-20 w-fit text-caption font-extrabold text-primary hover:underline"
            >
              {item.category}
            </Link>
          ) : (
            <span className="text-caption font-extrabold text-primary">{item.category}</span>
          ))}
      </div>
    </div>
  );
}


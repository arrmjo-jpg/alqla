import { ArrowUpLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { getCategoryById, getCategoryFeed, type CategoryRef, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// قسمان متجاوران (md:2 أعمدة) — كلّ قسم: ترويسة (شريط أحمر + عنوان + «عرض المزيد») + **شبكة 2×2** (٤ أخبار).
// نمط الكود المرجعيّ مُكيَّفًا لألوان الموقع (أحمر بدل الأزرق). **بالـID الثابت** (مقاوم لإعادة التسمية). فارغ ⇒ يُخفى.
export async function CategoryGridPair({ categories }: { categories: { categoryId: number; fallbackTitle?: string }[] }) {
  const blocks = (
    await Promise.all(
      categories.map(async (c) => {
        const category = await getCategoryById(c.categoryId);
        if (!category) return null;
        const items = await getCategoryFeed(category.slug, 4);
        if (items.length === 0) return null;
        return { category, items, fallbackTitle: c.fallbackTitle };
      }),
    )
  ).filter((b): b is NonNullable<typeof b> => b !== null);

  if (blocks.length === 0) return null;

  return (
    <section className="mt-6 bg-white sm:mt-8" dir="rtl" aria-label="أقسام منوّعة">
      <Container className="py-8 sm:py-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
          {blocks.map((b) => (
            <CategoryBlock key={b.category.id} category={b.category} items={b.items} fallbackTitle={b.fallbackTitle} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function CategoryBlock({
  category,
  items,
  fallbackTitle,
}: {
  category: CategoryRef;
  items: FeedItem[];
  fallbackTitle?: string;
}) {
  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = items[0]?.categoryHref ?? `/category/${encodeURIComponent(category.slug)}`;

  return (
    <section>
      {/* الترويسة — شريط أحمر يمين + عنوان + خطّ متدرّج + «عرض المزيد» */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link href={moreHref} className="group relative">
          <h2 className="border-r-4 border-primary pr-4 text-xl font-bold tracking-tight text-fg transition-colors group-hover:text-primary sm:text-2xl">
            {title}
          </h2>
          <span
            className="absolute -bottom-2 right-0 h-0.5 w-24 bg-gradient-to-l from-primary/0 via-primary/50 to-primary"
            aria-hidden
          />
        </Link>
        <Link
          href={moreHref}
          className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
        >
          <span>عرض المزيد</span>
          <ArrowUpLeft
            className="size-4 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>

      {/* شبكة 2×2 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {items.slice(0, 4).map((item) => (
          <GridCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// بطاقة — صورة 4:3 + تدرّج عند المرور + شارة القسم (أسفل يمين) + عنوان سطرين + الوقت. رابط يغطّي البطاقة.
function GridCard({ item }: { item: FeedItem }) {
  return (
    <article
      className="group overflow-hidden border border-border bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
      style={{ borderRadius: '12px' }}
    >
      <Link href={item.href} className="block" aria-label={item.title}>
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-3">
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
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
          {item.category && (
            <span
              className="absolute bottom-2.5 right-2.5 bg-primary px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ borderRadius: '6px' }}
            >
              {item.category}
            </span>
          )}
          {/* تاج عاجل/تغطية خاصة (أعلى البداية) */}
          <FeedBadge badge={item.badge} />
        </div>
        <div className="p-3">
          <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary">
            {item.title}
          </h3>
          {item.publishedAt && (
            <div className="flex items-center gap-1 text-xs font-medium text-muted">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <time dateTime={item.publishedAt}>{formatRelativeTime(item.publishedAt)}</time>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

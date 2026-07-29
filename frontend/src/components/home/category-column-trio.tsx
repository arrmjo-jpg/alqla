import { Clock } from 'lucide-react';
import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { SectionHeader } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type CategoryRef, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// 3 أعمدة جنب بعض (lg:grid-cols-3، تُكدّس عمود تحت عمود على الجوّال) — كلّ عمود قسم مستقلّ بترويسته
// الخاصّة: 4 أخبار، الأوّل بصورة كبيرة (16:9 + عنوان)، والباقي (3) بصورة صغيرة (110×70) + عنوان، مرصوصين
// تحت بعض بلا سكرول. **بالـID الثابت** (مقاوم لإعادة التسمية). عمود فارغ (تصنيف محذوف/بلا أخبار) يُحذف
// بلا كسر الشبكة؛ الكلّ فاضي ⇒ القسم كامل يُخفى.
export async function CategoryColumnTrio({
  categories,
}: {
  categories: { categoryId: number; fallbackTitle?: string }[];
}) {
  const columns = (
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

  if (columns.length === 0) return null;

  return (
    <section className="mt-6 sm:mt-8" dir="rtl">
      <Container>
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-3">
          {columns.map((col) => (
            <CategoryColumn
              key={col.category.id}
              category={col.category}
              items={col.items}
              fallbackTitle={col.fallbackTitle}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

function CategoryColumn({
  category,
  items,
  fallbackTitle,
}: {
  category: CategoryRef;
  items: FeedItem[];
  fallbackTitle?: string;
}) {
  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;
  const headingId = `trio-${category.id}-heading`;

  const feature = items[0];
  const list = items.slice(1, 4);

  return (
    <div>
      {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
      <SectionHeader title={title} headingId={headingId} href={moreHref} />

      <div className="flex flex-col gap-6">
        {feature && <FeatureCard item={feature} />}
        {list.length > 0 && (
          <ul className="divide-y divide-border">
            {list.map((item) => (
              <SmallItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// البطاقة الكبيرة — صورة 16:9 + قسم + عنوان + تاريخ. رابط متراكب يغطّي البطاقة.
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
        <h3 className="mt-1.5 text-base font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-lg">
          {item.title}
        </h3>
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

// شارة القسم (أحمر) — رابط مستقلّ فوق الرابط المتراكب.
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

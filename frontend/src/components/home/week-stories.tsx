import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { SectionHeader, SectionMore } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// قسم «ضيف الأسبوع» — قسمٌ مستقلّ (تصنيف فيرتكس #58): أحدث ٤ مقالات من تصنيف «ضيف الأسبوع».
// نفس **نمط عرض** قسم الوفيات (بطاقة أفقيّة: صورة مصغّرة + عنوان جنبها) لكن **بلا الخلفيّة الداكنة** — بطاقات
// فاتحة على خلفيّة بيضاء. **بالـID الثابت** (مقاوم لإعادة التسمية). لا قسم/مقالات ⇒ يُخفى.
export async function WeekStories({ categoryId, fallbackTitle }: { categoryId: number; fallbackTitle?: string }) {
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, 4);
  if (items.length === 0) return null;
  const title = category.name.trim() || fallbackTitle || 'ضيف الأسبوع';
  const moreHref = items[0]?.categoryHref ?? `/category/${encodeURIComponent(category.slug)}`;

  return (
    <section className="mt-6 bg-white sm:mt-8" dir="rtl" aria-labelledby="week-stories-heading">
      <Container className="py-8 sm:py-10">
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
        <SectionHeader title={title} headingId="week-stories-heading" href={moreHref} />

        {/* ٤ بطاقات أفقيّة فاتحة (نفس فكرة عرض الوفيات، بلا خلفيّة داكنة) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {items.slice(0, 4).map((item) => (
            <StoryCard key={item.id} item={item} />
          ))}
        </div>

        {/* «عرض الكل» أسفل القسم (نُقِل من أعلاه). */}
        <SectionMore href={moreHref} />
      </Container>
    </section>
  );
}

// بطاقة أفقيّة فاتحة — صورة مصغّرة + عنوان جنبها + تاريخ. رابط متراكب يغطّيها.
function StoryCard({ item }: { item: FeedItem }) {
  return (
    <article
      className="group relative flex items-start gap-2.5 border border-border bg-white p-2.5 transition-shadow hover:shadow-md"
      style={{ borderRadius: '12px' }}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      <div className="relative aspect-[4/3] w-[88px] shrink-0 overflow-hidden bg-surface-2 sm:w-[96px]" style={{ borderRadius: '8px' }}>
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
        {/* تاج عاجل/تغطية خاصة */}
        <FeedBadge badge={item.badge} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-3 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[15px]">
          {item.title}
        </h3>
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="mt-1.5 block text-xs font-medium text-muted">
            {formatRelativeTime(item.publishedAt)}
          </time>
        )}
      </div>
    </article>
  );
}

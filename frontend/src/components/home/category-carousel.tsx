import Link from 'next/link';

import { getCategoryById, getCategoryFeed } from '@/lib/feed';

import { CategoryCarouselStrip } from './category-carousel-strip';

// قسم تصنيف على شكل كورسل (تمرير أفقيّ) — **بالـID الثابت**: getCategoryById يحلّ الاسم/slug
// الحاليّين (مقاوم لإعادة التسمية)، والأخبار بمعرّفاتها في المسار (لا اختلاط). العنوان = اسم القسم،
// و«المزيد» → صفحة القسم. لا مقالات/قسم محذوف ⇒ يُخفى. ألوان الموقع (primary/fg/surface/border).
export async function CategoryCarousel({
  categoryId,
  fallbackTitle,
}: {
  categoryId: number;
  fallbackTitle?: string;
}) {
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, 12);
  if (items.length === 0) return null;

  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;
  const headingId = `carousel-${categoryId}-heading`;

  return (
    <section className="mt-6 sm:mt-8" aria-labelledby={headingId}>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        {/* الترويسة: شارة حمراء + اسم القسم + «المزيد» → صفحة القسم */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="h-7 w-1 shrink-0 bg-primary" style={{ borderRadius: '9999px' }} aria-hidden />
            <h2 id={headingId} className="font-heading text-xl font-extrabold text-fg sm:text-2xl">
              <Link href={moreHref} className="transition-colors hover:text-primary">
                {title}
              </Link>
            </h2>
          </div>
          <Link
            href={moreHref}
            className="flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-primary"
          >
            <span>المزيد</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-4" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        <CategoryCarouselStrip items={items} />
      </div>
    </section>
  );
}

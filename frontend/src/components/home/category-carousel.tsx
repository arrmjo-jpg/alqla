import { getCategoryById, getCategoryFeed } from '@/lib/feed';

import { CategoryCarouselStrip } from './category-carousel-strip';
import { SectionHeader, SectionMore } from './section-header';

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
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
        <SectionHeader title={title} headingId={headingId} href={moreHref} />

        <CategoryCarouselStrip items={items} />

        {/* «عرض الكل» أسفل القسم (نُقِل من أعلاه). */}
        <SectionMore href={moreHref} />
      </div>
    </section>
  );
}

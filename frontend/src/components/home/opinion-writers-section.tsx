import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { FeedBadge } from '@/components/home/featured-hero';
import { SectionHeader, SectionMore } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';

// قسم مقالات الرأي (أفقي، أسفل نبض الشارع) — شبكة بطاقات: صورة جانبية + عنوان المقال + اسم الكاتب.
// **الـslug ديناميّ عبر prop** (لا ثابت داخل المكوّن). المصدر `getCategoryFeed(slug,6)` + العنوان من التصنيف.
// **ملاحظة بيانات:** هذا الباك إند ينسب كلّ مقالات الرأي لكاتب عامّ واحد («كتاب الموقع») بلا كُتّاب أفراد ⇒
// الصورة = **غلاف المقال** (متمايز) لا صورة كاتب واحدة مكرّرة؛ حين تتوفّر صور كُتّاب يُبدَّل لـauthor.avatar.
// صفر تلفيق: لا مقالات ⇒ يُخفى.
export async function OpinionWritersSection({
  categoryId,
  headingId,
  fallbackTitle,
  skip = 0,
  forceTitle,
}: {
  categoryId: number;
  headingId: string;
  fallbackTitle?: string;
  skip?: number; // تخطّي أوّل N مقالات — لقسم «مقالات مختارة» المكرّر (يعرض غير مقالات القسم الأصليّ، بلا تكرار).
  forceTitle?: string; // عنوان مفروض يتجاوز اسم التصنيف — لقسم «مقالات مختارة».
}) {
  // **التصنيف بالـID الثابت** ⇒ الـslug/الاسم الحاليّان (مقاوم لإعادة التسمية). غير موجود ⇒ يُخفى.
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = (await getCategoryFeed(category.slug, skip + 6)).slice(skip, skip + 6);
  if (items.length === 0) return null;
  const title = forceTitle?.trim() || category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');
  const moreHref = items[0]?.categoryHref ?? `/category/${encodeURIComponent(category.slug)}`;

  return (
    <section className="mt-6 bg-white dark:bg-transparent sm:mt-8" dir="rtl" aria-labelledby={headingId}>
      <Container className="py-8 sm:py-10">
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
        <SectionHeader title={title} headingId={headingId} href={moreHref} />

        {/* شبكة أفقية — 1 على الجوال، 2 تابلت، 3 ديسكتوب لتناسب البطاقات الأفقية */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {items.map((item) => (
            <WriterCard key={item.id} item={item} />
          ))}
        </div>

        {/* «عرض الكل» أسفل القسم (نُقِل من أعلاه). */}
        <SectionMore href={moreHref} />
      </Container>
    </section>
  );
}

function WriterCard({ item }: { item: FeedItem }) {
  // الصورة: غلاف المقال (متمايز) ثمّ صورة الكاتب احتياطاً.
  const photo = item.image ?? item.author?.avatar ?? null;
  const author = item.author;
  // اسم الكاتب يفتح بروفيله **فقط إن كان كاتباً مفعّلاً** (id + isWriter)؛ غير المفعّل/المدير ⇒ نصّ.
  const writerHref = author?.isWriter && author.id ? `/writer/${author.id}` : null;

  return (
    <div className="group relative flex h-[100px] items-center gap-3 overflow-hidden rounded-xl border border-border/50 bg-surface p-2 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {/* الرابط الرئيسي يغطي البطاقة كلها */}
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      {/* الصورة الجانبية */}
      <div className="relative size-[84px] shrink-0 overflow-hidden rounded-lg bg-surface-2 shadow-sm">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={item.imageAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-surface-3" aria-hidden />
        )}
        {/* تاج «تغطية خاصة»/«عاجل» عند توفّر العلم. */}
        <FeedBadge badge={item.badge} />
      </div>

      {/* النص */}
      <div className="flex min-w-0 flex-1 flex-col justify-center text-start">
        <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[15px]">
          {item.title}
        </h3>
        
        {/* اسم الكاتب — رابط بروفيل مستقلّ (كاتب مفعّل) أو نصّ (غيره) */}
        {author?.name && (
          <div className="mt-1.5 relative z-20 w-fit">
            {writerHref ? (
              <Link href={writerHref} className="text-[12px] font-bold text-primary hover:underline">
                {author.name}
              </Link>
            ) : (
              <span className="text-[12px] text-muted">{author.name}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

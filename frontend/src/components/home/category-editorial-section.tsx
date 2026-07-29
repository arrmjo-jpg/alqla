import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { FeedBadge } from '@/components/home/featured-hero';
import { SectionHeader } from '@/components/home/section-header';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// قسم تصنيف تحريريّ مُعاد الاستخدام (شؤون برلمانية، نبض الشارع، …) — كتل متتابعة في الهوم.
// نمط الكتلة: getCategoryFeed(slug,8) ⇒ 4 مقالات مميّزة (بطاقة بتصميم الهيرو: صورة 16:9 تملأ
// الصندوق object-fill + قسم/تاريخ/عنوان overlay فوقها بتدرّج داكن) موزّعة عمودين مكدّسين (مقالان
// لكلّ عمود)، + قائمة 4 (مصغّرة 110×70) في شبكة 3 أعمدة RTL بفواصل لوجيّة. **يتكيّف مع قلّة
// المقالات**: لا قائمة ⇒ عمودان فقط بلا تكديس؛ عمود مميّز فيه مقال واحد بس إن نقص المحتوى.
// Server Component، ISR 300s، خطّ الجزيرة، تصميم مربّع، `text-primary`. لا مقالات ⇒ يُخفى.
export async function EditorialCategorySection({
  categoryId,
  headingId,
  fallbackTitle,
}: {
  categoryId: number;
  headingId: string;
  fallbackTitle?: string;
}) {
  // **التصنيف بالـID الثابت** ⇒ الـslug/الاسم الحاليّان (مقاوم لإعادة تسمية الإدارة). غير موجود/محذوف ⇒ يُخفى.
  const category = await getCategoryById(categoryId);
  if (!category) return null;
  const items = await getCategoryFeed(category.slug, 8);
  if (items.length === 0) return null;
  const title = category.name.trim() || fallbackTitle || category.slug.replace(/-/g, ' ');

  const features = items.slice(0, 4);
  const list = items.slice(4, 8);
  const hasList = list.length > 0;
  // عمودان مميّزان، كلّ واحد فيه مقالان مكدّسان فوق بعض.
  const col1 = features.slice(0, 2);
  const col2 = features.slice(2, 4);
  const moreHref = items[0]?.categoryHref ?? `/category/${encodeURIComponent(category.slug)}`;

  return (
    <section className="mt-6 bg-white sm:mt-8" dir="rtl" aria-labelledby={headingId}>
      <Container className="py-8 sm:py-10">
        {/* الترويسة الموحّدة: اسم القسم بخلفيّة حمراء + خطّ أبيض. */}
        <SectionHeader title={title} headingId={headingId} href={moreHref} />

        {/* الشبكة: عمودان مميّزان (مقالان مكدّسان لكلّ واحد) + قائمة — أو عمودان فقط عند قلّة المقالات */}
        {hasList ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-0">
            {col1.length > 0 && (
              <div className="flex h-full flex-col gap-3 lg:pe-6">
                {col1.map((item) => (
                  <FeatureArticle key={item.id} item={item} flexHeight />
                ))}
              </div>
            )}
            {col2.length > 0 && (
              <div className="flex h-full flex-col gap-3 lg:border-s lg:border-border lg:px-6">
                {col2.map((item) => (
                  <FeatureArticle key={item.id} item={item} flexHeight />
                ))}
              </div>
            )}
            <div className="lg:border-s lg:border-border lg:ps-6">
              <ul className="divide-y divide-border">
                {list.map((item) => (
                  <ListItem key={item.id} item={item} />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {features.map((item) => (
              <FeatureArticle key={item.id} item={item} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

// لون ذهبي موحّد — نفس ثابت الهيرو (hero-desktop-carousel.tsx).
const GOLD = '#C9A227';

// مقال مميّز — بتصميم بطاقة الهيرو نفسه: صورة كبيرة (object-fill تملأ الصندوق بالكامل بلا اقتصاص
// — بتمدّد لتملأ أيّ ارتفاع، بلا فقدان أي جزء من الصورة) + تدرّج داكن أسفلها + القسم/التاريخ فوق
// العنوان الأبيض، الكلّ فوق الصورة (overlay). رابط متراكب يغطّي البطاقة.
// flexHeight=true (عمودا التكديس): البطاقة flex-1 تشارك ارتفاع العمود الكامل بالتساوي مع شقيقتها،
// والعمود نفسه h-full يمتدّ تلقائيًّا ليطابق ارتفاع قائمة الأخبار الأربعة الجانبيّة (امتداد صفّ
// الـgrid) — فيتساوى ارتفاع الصور الكبيرة مع ارتفاع القائمة تمامًا. flexHeight=false (حالة عدم
// وجود قائمة جانبيّة): نسبة 16:9 ثابتة تقليديّة.
function FeatureArticle({
  item,
  className = '',
  flexHeight = false,
}: {
  item: FeedItem;
  className?: string;
  flexHeight?: boolean;
}) {
  return (
    <article
      className={`group relative overflow-hidden bg-surface-2 ${flexHeight ? 'min-h-0 flex-1' : 'aspect-[16/9]'} ${className}`}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />

      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
        <img
          src={item.image}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-fill transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-3" aria-hidden />
      )}

      {/* تدرّج داكن أسفل الصورة لإبراز العنوان الأبيض فوقه */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 40%, transparent 75%)' }}
        aria-hidden
      />

      {/* تاج «تغطية خاصة»/«عاجل» عند توفّر العلم — بمكانه الأصليّ أعلى الصورة، بلا تغيير. */}
      <FeedBadge badge={item.badge} />

      {/* القسم + التاريخ فوق العنوان — كلّه overlay أسفل الصورة. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-start gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.category && (
            <span className="pointer-events-auto text-caption font-bold text-white px-2 py-0.5" style={{ background: GOLD }}>
              {item.category}
            </span>
          )}
          {item.publishedAt && (
            <time dateTime={item.publishedAt} className="text-caption font-medium text-white/80">
              {formatRelativeTime(item.publishedAt)}
            </time>
          )}
        </div>
        <h3 className="line-clamp-2 text-base font-extrabold leading-tight text-white sm:text-lg">
          {item.title}
        </h3>
      </div>
    </article>
  );
}

// عنصر قائمة — صورة مصغّرة 110×70 + عنوان + قسم.
function ListItem({ item }: { item: FeedItem }) {
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

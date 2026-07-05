import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { Container } from '@/components/layout/container';
import { getCategoryById, getCategoryFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// آية سورة الفجر (٢٧–٣٠) — تُعرَض ذهبيّةً فوق بطاقات النعي/التعزية.
const VERSE =
  'يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ ارْجِعِي إِلَى رَبِّكِ رَاضِيَةً مَرْضِيَّةً فَادْخُلِي فِي عِبَادِي وَادْخُلِي جَنَّتِي';

const GOLD = '#e8c878';

// قسم الوفيات/التعزية — تصميم خاصّ مهيب **مدمج**: آيةٌ قرآنيّة ذهبيّة فوق خلفيّةٍ زمرّديّة داكنة + ٤ بطاقات زجاجيّة.
// **التصنيف بالـID الثابت** (مقاوم لإعادة التسمية). لا مقالات/قسم محذوف ⇒ يُخفى.
export async function ObituariesSection({
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
  const title = category.name.trim() || fallbackTitle || 'وفيات';
  const moreHref = `/category/${encodeURIComponent(category.slug)}`;

  return (
    <section className="mt-6 sm:mt-8" dir="rtl" aria-labelledby="obituaries-heading">
      <Container>
        <div
          className="relative overflow-hidden px-4 py-4 sm:px-8 sm:py-5"
          style={{ borderRadius: '18px', background: 'linear-gradient(155deg, #1a1a1a 0%, #0b0b0b 55%, #000000 100%)' }}
        >
          {/* توهّج ذهبيّ ناعم خلف الآية + إطار ذهبيّ داخليّ خافت */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28"
            style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(232,200,120,0.20), transparent 72%)' }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(232,200,120,0.16)', borderRadius: '18px' }}
            aria-hidden
          />

          {/* عنوان أنيق بخطّين جانبيّين */}
          <div className="relative mb-2.5 flex items-center justify-center gap-2.5">
            <span className="h-px w-8 sm:w-12" style={{ background: 'linear-gradient(to left, rgba(232,200,120,0.6), transparent)' }} aria-hidden />
            <h2 id="obituaries-heading" className="font-heading text-sm font-extrabold" style={{ color: GOLD }}>
              {title}
            </h2>
            <span className="h-px w-8 sm:w-12" style={{ background: 'linear-gradient(to right, rgba(232,200,120,0.6), transparent)' }} aria-hidden />
          </div>

          {/* الآية الذهبيّة — مدمجة، بقوسين قرآنيّين مزخرفين */}
          <p
            className="relative mx-auto max-w-2xl text-center font-heading text-sm font-bold leading-[1.95] sm:text-base sm:leading-[2]"
            style={{ color: '#f1dca0', textShadow: '0 0 20px rgba(232,200,120,0.25)' }}
          >
            <span className="align-middle" style={{ color: GOLD, fontSize: '1.3em' }}>﴿</span>
            {' '}
            {VERSE}
            {' '}
            <span className="align-middle" style={{ color: GOLD, fontSize: '1.3em' }}>﴾</span>
          </p>

          {/* فاصل زخرفيّ + صدق الله العظيم */}
          <div className="relative mb-3 mt-2 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(232,200,120,0.6))' }} />
            <span className="text-xs" style={{ color: GOLD }}>❖</span>
            <span className="text-[11px] font-bold" style={{ color: 'rgba(232,200,120,0.9)' }}>صدق الله العظيم</span>
            <span className="text-xs" style={{ color: GOLD }}>❖</span>
            <span className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(232,200,120,0.6))' }} />
          </div>

          {/* البطاقات */}
          <div className="relative grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            {items.slice(0, count).map((item) => (
              <ObituaryCard key={item.id} item={item} />
            ))}
          </div>

          {/* عرض الكل */}
          <div className="relative mt-3 flex justify-center">
            <Link
              href={moreHref}
              className="inline-flex items-center gap-1.5 border px-4 py-1 text-xs font-bold transition-colors"
              style={{ color: GOLD, borderColor: 'rgba(232,200,120,0.5)', borderRadius: '9999px' }}
            >
              عرض كلّ الوفيات
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-3.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

// بطاقة نعيٍ **أفقيّة** مدمجة — صورة مصغّرة + العنوان بجانبها (بارز) + تاريخ. حوافّ ذهبيّة خافتة، رابط متراكب يغطّيها.
function ObituaryCard({ item }: { item: FeedItem }) {
  return (
    <article
      className="group relative flex items-start gap-2.5 p-2.5 transition-colors hover:bg-white/[0.03]"
      style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,200,120,0.16)' }}
    >
      <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
      {/* صورة مصغّرة على جهة البداية (يمين في RTL) */}
      <div
        className="relative aspect-[4/3] w-[84px] shrink-0 overflow-hidden sm:w-[92px]"
        style={{ borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}
      >
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
          <div className="size-full" aria-hidden />
        )}
        {/* تاج عاجل/تغطية خاصة */}
        <FeedBadge badge={item.badge} />
      </div>
      {/* العنوان بجانب الصورة — بارز */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-extrabold leading-snug transition-colors sm:line-clamp-3 sm:text-[15px]" style={{ color: '#f6efdc' }}>
          {item.title}
        </h3>
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="mt-1.5 block text-[11px] font-medium" style={{ color: 'rgba(232,200,120,0.6)' }}>
            {formatRelativeTime(item.publishedAt)}
          </time>
        )}
      </div>
    </article>
  );
}

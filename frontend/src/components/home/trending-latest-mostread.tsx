import { Flame } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { WritersCarousel } from '@/components/home/writers-carousel';
import { LivePulse } from '@/components/ui/live-pulse';
import { getCategoryById, getCategoryFeed, getEditorsPickFeed, type FeedItem } from '@/lib/feed';

// ودجت (بألوان الموقع): تريندينغ (يمين، ثلث) + قسمَا كُتّاب مكدّسان فوق بعض (يسار، ثلثان: تصنيف #20 ثمّ #57).
//  • تريندينغ = is_editor_pick (صندوق أحمر، أرقام + صور).
//  • قسمَا الكُتّاب = مقالات كلّ تصنيف ببطاقات كاتب تنزلق تلقائيًّا (WritersCarousel، مكوّن عميل)؛ **اسم الكاتب
//    يفتح بروفيله وكلّ مقالاته**. الصورة = غلاف المقال، ولمقال الرأي بلا غلاف تُستخدَم صورة الكاتب تلقائيًّا. Server Component، ISR.
export async function TrendingLatestMostRead() {
  const editorsPick = await getEditorsPickFeed('ar', 5);

  return (
    <section className="mt-6 sm:mt-8" dir="rtl" aria-label="تريندينغ وأقلام الكُتّاب">
      <Container>
        {/* RTL: تريندينغ (يمين، ثلث) ← قسمَا كُتّاب مكدّسان فوق بعض (يسار، ثلثان). */}
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <TrendingBox items={editorsPick.slice(0, 5)} />
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            {/* قسمان مميّزان فوق بعض بشكلين مختلفين: «مقالات» (#20، عموديّ) ثمّ (#57، دائريّ). */}
            <WritersRow categoryId={20} variant="portrait" />
            <WritersRow categoryId={57} variant="circle" />
          </div>
        </div>
      </Container>
    </section>
  );
}

// قسم كُتّاب واحد — ترويسة (اسم التصنيف مميّز + شارة حمراء + «المزيد») + كاروسيل بطاقات الكُتّاب.
// بالـID الثابت (getCategoryById يحلّ الاسم/slug الحاليَّين)؛ فارغ/محذوف ⇒ يُخفى.
async function WritersRow({ categoryId, variant }: { categoryId: number; variant?: 'portrait' | 'circle' }) {
  const cat = await getCategoryById(categoryId);
  if (!cat) return null;
  const items = await getCategoryFeed(cat.slug, 12);
  if (items.length === 0) return null;
  const moreHref = `/category/${encodeURIComponent(cat.slug)}`;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        {/* اسم القسم بخلفيّة حمراء + خطّ أبيض (كترويسات باقي الموقع). */}
        <h2 className="font-heading text-sm font-extrabold sm:text-base">
          <Link
            href={moreHref}
            className="inline-block bg-primary px-2.5 py-1 text-white transition-opacity hover:opacity-90"
          >
            {cat.name}
          </Link>
        </h2>
        <Link
          href={moreHref}
          className="shrink-0 text-xs font-bold text-muted transition-colors hover:text-primary"
        >
          المزيد
        </Link>
      </div>
      <WritersCarousel items={items} variant={variant} />
    </div>
  );
}

// شارة الخبر — عاجل (is_breaking) أو تغطية خاصة (is_live). حبّة منمّقة بنبضة ping، **بعرض محتواها فقط**
// (self-start + w-fit ⇒ لا تتمدّد بعرض الصفّ). onDark: حبّة بيضاء فوق الصندوق الأحمر.
// شارة عاجل/تغطية خاصة — موحّدة مع بقيّة الموقع: أحمر فاقع #ff1e1e، حوافّ قائمة، أيقونة بثٍّ نابضة (LivePulse).
function Tag({ badge }: { badge: FeedItem['badge'] }) {
  if (!badge) return null;
  return (
    <span
      className="inline-flex w-fit max-w-full items-center gap-1.5 self-start whitespace-nowrap px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm"
      style={{ background: '#ff1e1e', borderRadius: 0 }}
    >
      {badge.kind === 'live' && <LivePulse />}
      {badge.label}
    </span>
  );
}

// صندوق «تريندينغ» — أحمر الموقع، عنوان + 5 صفوف: عنوان (يمين) + صورة بزاوية رقم (يسار).
function TrendingBox({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="flex h-full flex-col overflow-hidden text-white shadow-md"
      style={{ background: 'linear-gradient(160deg, #a30b13 0%, #850000 58%, #6b0000 100%)', borderRadius: '16px' }}
    >
      <div className="flex items-center gap-2 border-b border-white/15 px-4 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center bg-white/15" style={{ borderRadius: '9999px' }} aria-hidden>
          <Flame className="size-4" style={{ color: '#f4c22b' }} />
        </span>
        <h2 className="font-heading text-lg font-extrabold sm:text-xl">تريندينغ</h2>
      </div>
      <div className="flex flex-1 flex-col">
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-1 items-center gap-3 border-b border-white/10 px-4 py-3 transition-colors last:border-0 hover:bg-white/5"
          >
            <div className="order-1 flex min-w-0 flex-1 flex-col gap-1.5">
              {item.badge && <Tag badge={item.badge} />}
              <h3 className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</h3>
            </div>
            <div className="relative order-2 shrink-0">
              <div className="h-[64px] w-[112px] overflow-hidden bg-white/10" style={{ borderRadius: '8px' }}>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <div className="size-full bg-white/10" aria-hidden />
                )}
              </div>
              <span
                className="absolute -bottom-1.5 -start-1.5 flex size-6 items-center justify-center text-xs font-extrabold text-[#3a2c08] shadow"
                style={{ background: '#f4c22b', borderRadius: '9999px' }}
                aria-hidden
              >
                {i + 1}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


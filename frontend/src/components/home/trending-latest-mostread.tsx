import { Flame } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { LivePulse } from '@/components/ui/live-pulse';
import { getCategoryById, getCategoryFeed, getEditorsPickFeed, type FeedItem } from '@/lib/feed';

// ودجت (بألوان الموقع): تريندينغ (يمين، ثلث) + قسمَا كُتّاب مكدّسان فوق بعض (يسار، ثلثان: تصنيف #20 ثمّ #57).
//  • تريندينغ = is_editor_pick (صندوق أحمر، أرقام + صور).
//  • قسمَا الكُتّاب = مقالات كلّ تصنيف ببطاقات كاتب تنزلق تلقائيًّا (WritersCarousel، مكوّن عميل)؛ **اسم الكاتب
//    يفتح بروفيله وكلّ مقالاته**. الصورة = غلاف المقال، ولمقال الرأي بلا غلاف تُستخدَم صورة الكاتب تلقائيًّا. Server Component، ISR.
export async function TrendingLatestMostRead({ editorsPick }: { editorsPick?: FeedItem[] }) {
  const resolvedEditorsPick = editorsPick ?? (await getEditorsPickFeed(5, 'ar'));

  return (
    <section className="mt-6 sm:mt-8" dir="rtl" aria-label="تريندينغ وأقلام الكُتّاب">
      <Container>
        {/* RTL: تريندينغ (يمين، ثلث) ← قسمَا كُتّاب مكدّسان فوق بعض (يسار، ثلثان). */}
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <TrendingBox items={resolvedEditorsPick.slice(0, 5)} />
          <WritersRow categoryId={20} variant="portrait" />
          <WritersRow categoryId={57} variant="circle" />
        </div>
      </Container>
    </section>
  );
}

// قسم كُتّاب واحد بتصميمات فخمة ومتميزة (VIP & Premium)
// بالـID الثابت (getCategoryById يحلّ الاسم/slug الحاليَّين)؛ فارغ/محذوف ⇒ يُخفى.
async function WritersRow({ categoryId, variant }: { categoryId: number; variant?: 'portrait' | 'circle' }) {
  const cat = await getCategoryById(categoryId);
  if (!cat) return null;
  // جلب 5 مقالات فقط ليتطابق الارتفاع مع صندوق تريندينغ
  const items = await getCategoryFeed(cat.slug, 5);
  if (items.length === 0) return null;
  const moreHref = `/category/${encodeURIComponent(cat.slug)}`;

  const isVIP = variant === 'circle';

  if (isVIP) {
    // -------------------------------------------------------------
    // 1) VIP Dark/Gold Design (لمقالات مختارة) - فخامة عالية جداً
    // -------------------------------------------------------------
    return (
      <div className="flex min-w-0 flex-col rounded-[20px] bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-5 shadow-xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#d4af37]">
            {/* أيقونة نجمة ذهبية صغيرة بجانب العنوان تعطي طابع التميز */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
            <span>{cat.name}</span>
          </h2>
          <Link href={moreHref} className="text-xs font-bold text-white/50 transition-colors hover:text-[#d4af37]">
            المزيد
          </Link>
        </div>
        
        <div className="flex flex-col">
          {items.map((item) => {
            const photo = item.image ?? item.author?.avatar ?? null;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center gap-4 border-b border-white/5 py-3.5 last:border-0 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-white/90 group-hover:text-[#d4af37] transition-colors">
                    {item.title}
                  </h3>
                  {item.author?.name && (
                    <span className="mt-1.5 text-xs font-extrabold text-[#d4af37]">
                      {item.author.name}
                    </span>
                  )}
                </div>
                
                {/* الصورة الدائرية بدقة مع إطار ذهبي */}
                <div 
                  className="relative h-[68px] w-[68px] shrink-0 overflow-hidden bg-zinc-800 shadow-lg ring-2 ring-[#d4af37]/30 transition-all group-hover:ring-[#d4af37]"
                  style={{ borderRadius: '9999px' }}
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={item.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="size-full bg-zinc-800" aria-hidden />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2) Premium Light Design (للمقالات العادية) - أنيق ونظيف جداً
  // -------------------------------------------------------------
  return (
    <div className="relative flex min-w-0 flex-col overflow-hidden rounded-[20px] bg-surface p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/10">
      {/* خط أحمر رفيع وراقي في أعلى الصندوق */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-red-400" />
      
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/50 pb-4 pt-1">
        <h2 className="font-heading text-lg font-extrabold text-primary">
          {cat.name}
        </h2>
        <Link href={moreHref} className="text-xs font-bold text-muted transition-colors hover:text-primary">
          المزيد
        </Link>
      </div>
      
      <div className="flex flex-col">
        {items.map((item) => {
          const photo = item.image ?? item.author?.avatar ?? null;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center gap-4 border-b border-border/40 py-3.5 last:border-0 hover:bg-surface-2/60 transition-colors"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="line-clamp-2 text-[14px] font-bold leading-[1.5] text-fg group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                {item.author?.name && (
                  <span className="mt-1.5 text-xs font-extrabold text-primary/80">
                    {item.author.name}
                  </span>
                )}
              </div>
              
              {/* الصورة المربعة بحواف ناعمة */}
              <div className="relative h-[68px] w-[90px] shrink-0 overflow-hidden rounded-[10px] bg-surface-2 shadow-sm ring-1 ring-black/5 transition-all group-hover:ring-primary/20">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={item.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <div className="size-full bg-surface-3" aria-hidden />
                )}
              </div>
            </Link>
          );
        })}
      </div>
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


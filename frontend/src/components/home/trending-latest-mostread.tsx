import { Flame } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { LivePulse } from '@/components/ui/live-pulse';
import { getEditorsPickFeed, getHeaderFeed, getMostReadFeed, type FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

// ودجت ثلاثة أعمدة (نمط المرجع، بألوان الموقع) — من **كلّ الأقسام** حسب العلم، لا قسمًا محدّدًا:
//  • تريندينغ  = is_editor_pick (صندوق أحمر، أرقام + صور).
//  • أحدث الأخبار = is_header (قائمة عناوين + تاريخ).
//  • الأكثر قراءة = الأكثر مشاهدةً خلال الشهر (days=30).
// شارة «عاجل»/«تغطية خاصة» تظهر حين يكون الخبر عاجلًا أو تغطيةً مباشرة. Server Component، ISR.
export async function TrendingLatestMostRead() {
  const [editorsPick, header, mostRead] = await Promise.all([
    getEditorsPickFeed('ar', 5),
    getHeaderFeed('ar'),
    getMostReadFeed('ar', 5, 30), // الأكثر قراءة خلال الشهر
  ]);

  if (editorsPick.length === 0 && header.length === 0 && mostRead.length === 0) return null;

  return (
    <section className="mt-6 sm:mt-8" dir="rtl" aria-label="تريندينغ وأحدث الأخبار والأكثر قراءة">
      <Container>
        {/* RTL: تريندينغ (يمين) ← أحدث الأخبار (وسط) ← الأكثر قراءة (يسار) */}
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <TrendingBox items={editorsPick.slice(0, 5)} />
          <NewsList title="آخر المستجدات" items={header.slice(0, 6)} moreHref="/latest" />
          <NewsList title="الأكثر قراءة" items={mostRead.slice(0, 6)} />
        </div>
      </Container>
    </section>
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

// قائمة عناوين (أحدث الأخبار / الأكثر قراءة) — عنوان + شارة + تاريخ نسبيّ. رابط الخبر بمعرّفه في المسار.
function NewsList({ title, items, moreHref }: { title: string; items: FeedItem[]; moreHref?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold text-fg sm:text-xl">
          <span className="h-5 w-1 shrink-0 bg-primary" style={{ borderRadius: '9999px' }} aria-hidden />
          {moreHref ? (
            <Link href={moreHref} className="transition-colors hover:text-primary">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {moreHref && (
          <Link href={moreHref} className="shrink-0 text-xs font-bold text-muted transition-colors hover:text-primary">
            المزيد
          </Link>
        )}
      </div>
      <ul className="flex flex-1 flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="group flex flex-1 flex-col justify-center py-3 first:pt-0 last:pb-0">
            <Link href={item.href} className="block">
              <div className="flex flex-wrap items-start gap-1.5">
                {item.badge && <Tag badge={item.badge} />}
                <h3 className="line-clamp-2 flex-1 text-sm font-bold leading-6 text-fg transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
              </div>
              {item.publishedAt && (
                <time dateTime={item.publishedAt} className="mt-1.5 block text-xs font-medium text-muted">
                  {formatRelativeTime(item.publishedAt)}
                </time>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

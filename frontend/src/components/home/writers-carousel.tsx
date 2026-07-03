'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

type Variant = 'portrait' | 'circle';

// كاروسيل بطاقات كُتّاب — ينزلق تلقائيًّا. **شكلان مختلفان** (لتمييز القسمين):
//   • portrait — صورة عموديّة 4:5 + عنوان + اسم صغير (القسم الأوّل).
//   • circle   — صورة دائريّة + اسم الكاتب بارز + عنوان صغير (القسم الثاني).
// مكوّن عميل: تقدّم كل ~3.5ث عبر scrollBy على المسار **نفسه فقط** (آمن — لا يُحرّك الصفحة، ويحترم RTL:
// التقدّم = scrollLeft سالب)، يتوقّف عند المرور/التركيز وتقليل الحركة، ويسمح بالسحب اليدويّ.
// اسم الكاتب رابط مستقلّ يفتح بروفيله وكلّ مقالاته.
export function WritersCarousel({ items, variant = 'portrait' }: { items: FeedItem[]; variant?: Variant }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let paused = false;
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);

    const timer = window.setInterval(() => {
      if (paused) return;
      const first = track.querySelector<HTMLElement>('[data-card]');
      if (!first) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 4) return; // لا فيض ⇒ لا حاجة للتقدّم.
      const step = first.offsetWidth + 12; // عرض البطاقة + gap-3 (12px).
      const atEnd = Math.abs(track.scrollLeft) >= maxScroll - 4;
      // scrollBy/scrollTo على المسار فقط ⇒ لا يمسّ تمرير الصفحة (إصلاح «التدمير» على الموبايل).
      if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: -step, behavior: 'smooth' });
    }, 3500);

    return () => {
      window.clearInterval(timer);
      track.removeEventListener('pointerenter', pause);
      track.removeEventListener('pointerleave', resume);
      track.removeEventListener('focusin', pause);
      track.removeEventListener('focusout', resume);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      ref={trackRef}
      className="flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <WriterCard key={item.id} item={item} variant={variant} />
      ))}
    </div>
  );
}

function WriterCard({ item, variant }: { item: FeedItem; variant: Variant }) {
  return variant === 'circle' ? <CircleCard item={item} /> : <PortraitCard item={item} />;
}

function cardPhoto(item: FeedItem): string | null {
  return item.image ?? item.author?.avatar ?? null;
}

// اسم الكاتب — رابط بروفيل مستقلّ (كاتب مفعّل: isWriter + id) أو نصّ.
function AuthorName({ item, className }: { item: FeedItem; className: string }) {
  const author = item.author;
  if (!author?.name) return null;
  const writerHref = author.isWriter && author.id ? `/writer/${author.id}` : null;
  return writerHref ? (
    <Link href={writerHref} className={`${className} hover:underline`}>
      {author.name}
    </Link>
  ) : (
    <span className={className}>{author.name}</span>
  );
}

// شكل 1 (القسم الأوّل): بطاقة عموديّة 4:5 + عنوان + اسم صغير.
function PortraitCard({ item }: { item: FeedItem }) {
  const photo = cardPhoto(item);
  return (
    <div data-card className="w-40 shrink-0 snap-start sm:w-44">
      <Link href={item.href} className="group block" aria-label={item.title}>
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2" style={{ borderRadius: '12px' }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
            <img
              src={photo}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="size-full bg-surface-3" aria-hidden />
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-fg transition-colors group-hover:text-primary">
          {item.title}
        </h3>
      </Link>
      {/* صفّ بطرفين («شمال يمين»): اسم الكاتب بارز (البداية/يمين، أولويّة ظهور) ⟷ التاريخ (النهاية/شمال، يتقلّص). */}
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <AuthorName item={item} className="shrink-0 text-sm font-extrabold text-primary" />
        {item.publishedAt && (
          <time dateTime={item.publishedAt} className="min-w-0 shrink truncate text-[10px] font-medium text-muted">
            {formatRelativeTime(item.publishedAt)}
          </time>
        )}
      </div>
    </div>
  );
}

// شكل 2 (القسم الثاني): صورة **دائريّة** + اسم الكاتب **بارز** (أوّلًا، أكبر) + عنوان صغير — موسّطة.
function CircleCard({ item }: { item: FeedItem }) {
  const photo = cardPhoto(item);
  return (
    <div data-card className="w-36 shrink-0 snap-start text-center sm:w-40">
      <Link href={item.href} className="group block" aria-label={item.title}>
        <div
          className="relative mx-auto aspect-square w-24 overflow-hidden bg-surface-2 sm:w-28"
          style={{ borderRadius: '9999px', boxShadow: '0 0 0 2px rgba(133,0,0,0.22)' }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- <img> مقصود: حارس أداء الهوم
            <img
              src={photo}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="size-full bg-surface-3" aria-hidden />
          )}
        </div>
      </Link>
      {/* الاسم بارز: أكبر وبولد وبلون الموقع، تحت الصورة مباشرةً. */}
      <AuthorName item={item} className="mt-2 block text-sm font-extrabold text-primary" />
      <Link
        href={item.href}
        className="mt-0.5 block line-clamp-2 text-xs leading-snug text-muted transition-colors hover:text-fg"
      >
        {item.title}
      </Link>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { FeedBadge } from '@/components/home/featured-hero';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';

export function TopNewsCarousel({ items }: { items: FeedItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    // في وضع RTL (من اليمين لليسار)، تكون قيمة scrollLeft سالبة عندما نتحرك لليسار
    // لذا نستخدم القيمة المطلقة لتسهيل الحسابات
    const absScroll = Math.abs(scrollLeft);
    setCanScrollRight(absScroll < scrollWidth - clientWidth - 5);
    setCanScrollLeft(absScroll > 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // dir: -1 للتالي (يسار)، 1 للسابق (يمين)
  const scroll = (dir: 1 | -1) => {
    if (!scrollRef.current) return;
    // عرض العنصر الأول + المسافة بين العناصر (16px)
    const cardWidth = (scrollRef.current.children[0] as HTMLElement)?.offsetWidth || 300;
    const scrollAmount = cardWidth + 16;
    scrollRef.current.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-red-700 py-10 shadow-2xl mt-4">
      {/* تأثير إضاءة متحرك في الخلفية لإعطاء طابع إبداعي */}
      <div className="pointer-events-none absolute -left-[20%] -top-[50%] size-[150%] animate-[spin_40s_linear_infinite] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)]" />
      
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-2xl font-extrabold text-white drop-shadow-md">
            <Zap className="size-6 fill-yellow-400 text-yellow-400" />
            أبرز الأخبار
          </h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => scroll(1)} // يمين (السابق)
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-yellow-400 hover:text-red-900 disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
              aria-label="السابق"
            >
              <ChevronRight className="size-6" />
            </button>
            <button
              onClick={() => scroll(-1)} // يسار (التالي)
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-yellow-400 hover:text-red-900 disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white"
              aria-label="التالي"
            >
              <ChevronLeft className="size-6" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div 
              key={item.id} 
              className="snap-start shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(20%-0.8rem)]"
            >
              <article className="group relative h-[220px] w-full overflow-hidden rounded-2xl bg-black shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-900/50">
                <Link href={item.href} className="absolute inset-0 z-20" aria-label={item.title} />
                
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.imageAlt || item.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  />
                ) : (
                  <div className="size-full bg-surface-3" />
                )}
                
                {item.badge && (
                  <div className="absolute right-4 top-4 z-10">
                    <FeedBadge badge={item.badge} />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 z-10 flex h-3/5 flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-transparent p-5 transition-all duration-300 group-hover:h-full group-hover:from-red-950/95 group-hover:via-red-900/80">
                  <h3 className="line-clamp-3 text-lg font-bold leading-tight text-white transition-colors group-hover:text-yellow-400">
                    {item.title}
                  </h3>
                  {item.publishedAt && (
                    <time dateTime={item.publishedAt} className="mt-3 block text-xs font-medium text-gray-300">
                      {formatRelativeTime(item.publishedAt)}
                    </time>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

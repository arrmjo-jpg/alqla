import Link from 'next/link';
import { Clock } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { formatRelativeTime } from '@/lib/format';
import type { FeedItem } from '@/lib/feed';

interface Props {
  items: FeedItem[];
}

export function NetworkGrid({ items }: Props) {
  if (!items || items.length === 0) return null;

  const displayItems = items.slice(0, 8);

  return (
    <div className="w-full bg-[#f3f4f6] py-5 dark:bg-surface-1/50 my-2">
      <div className="mx-auto w-full max-w-[1200px] px-3 sm:px-6 lg:px-8">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              title={item.title}
              className="group flex w-[140px] shrink-0 snap-start flex-col overflow-hidden rounded-[10px] bg-surface shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:ring-white/10 sm:w-[150px] lg:w-auto"
            >
              {/* Image Section */}
              <div className="relative aspect-[16/11] w-full shrink-0 overflow-hidden bg-surface-2">
                <OptimizedImage
                  src={item.image}
                  alt={item.title}
                  className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  priority
                  sizes="(max-width: 1024px) 150px, 150px"
                />
              </div>

              {/* Content Section */}
              <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                <h3 className="line-clamp-3 text-center text-[12px] font-bold leading-snug text-fg transition-colors group-hover:text-primary sm:text-[13px]">
                  {item.title}
                </h3>

                <div className="mt-auto pt-3">
                  {item.publishedAt ? (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted sm:text-[11px]">
                      <Clock className="size-3 shrink-0" />
                      <time dateTime={item.publishedAt}>
                        {formatRelativeTime(item.publishedAt)}
                      </time>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';

interface Props {
  items: FeedItem[];
}

export function NetworkGrid({ items }: Props) {
  if (!items || items.length === 0) return null;

  // Ensure we only take up to 8 items
  const displayItems = items.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 mt-4 mb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            title={item.title}
            className="group flex h-[100px] items-stretch overflow-hidden rounded-xl border border-primary/50 bg-background transition-colors hover:border-primary"
          >
            {/* Image side (First in flex, so it's on the Right in RTL) */}
            <div className="relative w-[110px] shrink-0 border-l border-primary/20">
              <OptimizedImage
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover"
                priority // Since this is at the very top of the page
                sizes="110px"
              />
            </div>

            {/* Text side (Second in flex, so it's on the Left in RTL) */}
            <div className="flex flex-1 flex-col justify-center p-2 px-3 text-center">
              <h3 className="line-clamp-3 text-[13px] font-bold leading-snug text-primary transition-colors group-hover:text-primary/80">
                {item.title}
              </h3>
              {item.category && (
                <span className="mt-1 block text-[11px] font-bold text-primary/80">
                  {item.category}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

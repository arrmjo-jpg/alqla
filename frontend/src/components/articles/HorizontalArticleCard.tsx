import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';
import { ArticleInteractionBar } from './ArticleInteractionBar';

export function HorizontalArticleCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col justify-between p-4 bg-surface border border-border/40 hover:border-primary/30 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-md h-full">
      <div className="flex items-start justify-between gap-4 min-w-0">
        
        {/* Right side: Text details (First in RTL flow) */}
        <div className="flex-1 min-w-0 flex flex-col">
          
          {/* Category & Time */}
          <div className="flex items-center gap-2 text-caption font-bold text-muted mb-1.5 flex-wrap">
            {item.category && (
              item.categoryHref ? (
                <Link
                  href={item.categoryHref}
                  className="relative z-20 text-primary hover:underline"
                >
                  {item.category}
                </Link>
              ) : (
                <span className="text-primary">{item.category}</span>
              )
            )}
            {item.category && item.publishedAt && <span className="text-muted-foreground/30 font-normal">|</span>}
            {item.publishedAt && (
              <time dateTime={item.publishedAt} className="font-semibold text-muted-foreground">
                {formatRelativeTime(item.publishedAt)}
              </time>
            )}
          </div>

          {/* Title */}
          <h3 className="font-heading text-sm sm:text-base font-extrabold leading-snug text-fg group-hover:text-primary transition-colors line-clamp-3">
            <Link href={item.href} className="focus:outline-none">
              {item.title}
            </Link>
          </h3>

          {/* Subtitle (only for opinions) */}
          {item.type === 'opinion' && item.subtitle && (
            <h4 className="text-[13px] sm:text-[14px] font-bold text-primary mt-1 line-clamp-2 leading-relaxed">
              {item.subtitle}
            </h4>
          )}
        </div>

        {/* Left side: Image (Second in RTL flow) */}
        <div className="relative w-20 sm:w-28 aspect-[4/3] rounded-xl overflow-hidden bg-surface-2 shrink-0 select-none">
          <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} tabIndex={-1} />
          {item.image ? (
            <OptimizedImage
              src={item.image}
              alt={item.imageAlt ?? item.title}
              sizes="(max-width: 640px) 80px, 120px"
              className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-surface-3" aria-hidden />
          )}
          <FeedBadge badge={item.badge} />
        </div>
      </div>

      {/* Interaction Area at the bottom */}
      <ArticleInteractionBar articleId={item.id} />
    </article>
  );
}

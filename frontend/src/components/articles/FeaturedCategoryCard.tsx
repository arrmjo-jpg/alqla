import Link from 'next/link';

import { FeedBadge } from '@/components/home/featured-hero';
import { OptimizedImage } from '@/components/ui/optimized-image';
import type { FeedItem } from '@/lib/feed';
import { formatRelativeTime } from '@/lib/format';
import { ArticleInteractionBar } from './ArticleInteractionBar';

export function FeaturedCategoryCard({ item }: { item: FeedItem }) {
  return (
    <article className="group relative flex flex-col justify-between p-5 bg-surface border border-border/50 hover:border-primary/20 transition-all duration-300 rounded-3xl shadow-sm hover:shadow-md select-none w-full">
      <div className="space-y-4">
        {/* Aspect Ratio 16:9 Image with zoom hover effect */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-surface-2 select-none">
          <Link href={item.href} className="absolute inset-0 z-10" aria-label={item.title} />
          {item.image ? (
            <OptimizedImage
              src={item.image}
              alt={item.imageAlt ?? item.title}
              sizes="(max-width: 768px) 100vw, 800px"
              priority
              className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-102"
            />
          ) : (
            <div className="size-full bg-surface-3" aria-hidden />
          )}
          <FeedBadge badge={item.badge} />
        </div>

        {/* Text details */}
        <div className="flex flex-col space-y-2">
          {/* Category & Time Row */}
          <div className="flex items-center gap-2 text-caption font-bold text-muted flex-wrap">
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

          {/* Large Title */}
          <h2 className="font-heading text-lg sm:text-2xl font-extrabold leading-tight text-fg group-hover:text-primary transition-colors">
            <Link href={item.href} className="focus:outline-none">
              {item.title}
            </Link>
          </h2>

          {/* Subtitle (only for opinions) */}
          {item.type === 'opinion' && item.subtitle && (
            <h3 className="text-[15px] sm:text-[17px] font-bold text-primary mt-1 line-clamp-2 leading-relaxed">
              {item.subtitle}
            </h3>
          )}

          {/* Excerpt */}
          {item.excerpt && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3 pt-1">
              {item.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Interaction Bar */}
      <ArticleInteractionBar articleId={item.id} />
    </article>
  );
}

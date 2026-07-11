import Link from 'next/link';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { enRelative, enUrl } from '@/lib/en';
import type { FeedItem } from '@/lib/feed';

import { EnFeedBadge } from './en-feed-badge';

// Fork merging FeedCard (components/feed/feed-card.tsx, AR's /latest page) and the inline
// TrendingCard (app/(site)/trending/page.tsx, AR's /trending page) into one card with an optional
// rank badge — the two AR originals are otherwise visually identical. Both render Arabic
// unconditionally (badge.label direct + formatRelativeTime), so this fork uses
// EnFeedBadge/enRelative instead.
export function EnFeedGridCard({ item, rank }: { item: FeedItem; rank?: number }) {
  const href = enUrl(item.href);
  return (
    <div className="en-feedgrid-card">
      <Link href={href} className="en-feedgrid-card__link" aria-label={item.title} />

      <div className="en-feedgrid-card__media">
        <OptimizedImage
          cover={item.cover}
          src={item.image}
          alt={item.imageAlt}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="en-feedgrid-card__img"
        />
        {rank !== undefined && <span className="en-feedgrid-card__rank">{String(rank).padStart(2, '0')}</span>}
        <EnFeedBadge badge={item.badge} />
      </div>

      <div className="en-feedgrid-card__body">
        <div className="en-feedgrid-card__meta">
          {item.category &&
            (item.categoryHref ? (
              <Link href={enUrl(item.categoryHref)} className="en-hero-chip">{item.category}</Link>
            ) : (
              <span className="en-hero-chip">{item.category}</span>
            ))}
          {item.publishedAt && (
            <time dateTime={item.publishedAt} className="en-feedgrid-card__date">
              {enRelative(item.publishedAt)}
            </time>
          )}
        </div>
        <h3 className="en-feedgrid-card__title">{item.title}</h3>
      </div>
    </div>
  );
}
